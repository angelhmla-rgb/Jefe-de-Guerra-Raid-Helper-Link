const { Client: DiscordClient, GatewayIntentBits } = require('discord.js');
const { Client: WhatsAppClient, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Almacén en memoria para no repetir alertas ya enviadas
const alertasEnviadas = new Set();
let datosRaid = null;

// 1. CONFIGURACIÓN DE DISCORD
const discordClient = new DiscordClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 2. CONFIGURACIÓN DE WHATSAPP
const whatsappClient = new WhatsAppClient({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--unhandled-rejections=strict']
    }
});

// Mostrar el QR en los logs de Railway
whatsappClient.on('qr', (qr) => {
    console.log('--- ESCANEA ESTE CÓDIGO QR EN TU CELULAR ---');
    qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', () => {
    console.log('¡WhatsApp conectado exitosamente!');
    discordClient.login(process.env.DISCORD_TOKEN);
});

discordClient.on('ready', () => {
    console.log(`Bot de Discord conectado como ${discordClient.user.tag}`);
    // Iniciar el reloj que revisa el tiempo cada 60 segundos
    setInterval(revisarRelojRaid, 60000);
});

// 3. CAPTURAR CUANDO RAID HELPER CREA O ACTUALIZA LA RAID
discordClient.on('messageCreate', async (message) => {
    // Obtiene la lista de canales y los separa por comas
    const CANALES_RAID_HELPER = process.env.DISCORD_CHANNEL_ID ? process.env.DISCORD_CHANNEL_ID.split(',') : [];
    
    // Si el canal del mensaje NO está en nuestra lista de 14 canales, ignora el mensaje
    if (!CANALES_RAID_HELPER.includes(message.channel.id)) return;

    if (message.embeds.length > 0) {
        const embed = message.embeds[0];
        
        // Raid Helper incluye un Unix Timestamp en la descripción o campos (ej: <t:1718841600:F>)
        const infoTexto = (embed.description || "") + JSON.stringify(embed.fields);
        const matchTimestamp = infoTexto.match(/<t:(\d+):/);
        
        if (matchTimestamp) {
            const timestampRaid = parseInt(matchTimestamp[1]) * 1000; // Convertir a milisegundos
            
            // Extraer lista de apuntados de los campos del Embed
            let listaApuntados = "";
            embed.fields.forEach(field => {
                if (field.name.includes("Sign-ups") || field.name.includes("Inscritos") || field.name.includes("Lista")) {
                    listaApuntados += `*${field.name}:*\n${field.value}\n\n`;
                }
            });

            // Guardar datos en memoria
            datosRaid = {
                id: message.id,
                titulo: embed.title || "Raid de la Hermandad",
                horaInicio: timestampRaid,
                lista: listaApuntados || "Sin apuntados registrados aún."
            };
            console.log(`[Raid Detectada] "${datosRaid.titulo}" programada para: ${new Date(timestampRaid).toLocaleString()}`);
        }
    }
});

// 4. LÓGICA DEL RELOJ (4h, 2h, 30m, 15m)
async function revisarRelojRaid() {
    if (!datosRaid) return;

    const ahora = Date.now();
    const tiempoRestanteMinutos = Math.round((datosRaid.horaInicio - ahora) / 60000);
    
    // Tiempos objetivo en minutos
    const alertasObjetivo = [
        { minutos: 240, etiqueta: "4 horas", id: "4h" },
        { minutos: 120, etiqueta: "2 horas", id: "2h" },
        { minutos: 30,  etiqueta: "30 minutos", id: "30m" },
        { minutos: 15,  etiqueta: "15 minutos", id: "15m" }
    ];

    for (const alerta of alertasObjetivo) {
        const claveAlerta = `${datosRaid.id}_${alerta.id}`;
        
        // Si estamos en el rango de minutos de la alerta y no se ha enviado antes
        if (tiempoRestanteMinutos <= alerta.minutos && tiempoRestanteMinutos > (alerta.minutos - 5) && !alertasEnviadas.has(claveAlerta)) {
            
            const WHATSAPP_GROUP_ID = process.env.WHATSAPP_GROUP_ID;
            const mensaje = `⏳ *¡FALTAN ${alerta.etiqueta.toUpperCase()} PARA LA RAID!* ⏳\n\n*⚔️ Raid:* ${datosRaid.titulo}\n\n${datosRaid.lista}¡Muchachos, quedan pocos lugares! Los que tengan oportunidad busquen sumarse en Discord para armar el avance.`;

            try {
                await whatsappClient.sendMessage(WHATSAPP_GROUP_ID, mensaje);
                alertasEnviadas.add(claveAlerta);
                console.log(`[WhatsApp] Alerta de ${alerta.etiqueta} enviada con éxito.`);
            } catch (error) {
                console.error(`Error al enviar alerta de ${alerta.etiqueta}:`, error);
            }
        }
    }
}

whatsappClient.initialize();

