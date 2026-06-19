const { Client: DiscordClient, GatewayIntentBits } = require('discord.js');
const { Client: WhatsAppClient, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

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
        executablePath: '/usr/bin/google-chrome-stable',
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--unhandled-rejections=strict'
        ]
    }
});

// CUANDO WHATSAPP CONECTA CON ÉXITO
whatsappClient.on('ready', () => {
    console.log('¡WhatsApp conectado exitosamente y listo para enviar alertas!');
    // Conectar a Discord solo cuando WhatsApp está listo
    discordClient.login(process.env.DISCORD_TOKEN);
});

// MOSTRAR QR EN CONSOLA SI LLEGA A REQUERIRSE
whatsappClient.on('qr', (qr) => {
    console.log('--- ESCANEA ESTE CÓDIGO QR EN TU CELULAR ---');
    qrcode.generate(qr, { small: true });
});

discordClient.on('ready', () => {
    console.log(`Bot de Discord conectado como ${discordClient.user.tag}`);
});

// ESCUCHAR CANALES DE DISCORD Y REENVIAR RE ENVIOS DE RAID HELPER
discordClient.on('messageCreate', async (message) => {
    // Obtener los 14 canales permitidos desde las variables
    const canalesPermitidos = (process.env.DISCORD_CHANNEL_ID || '').split(',').map(id => id.trim());
    
    if (!canalesPermitidos.includes(message.channelId)) return;

    // Detectar si el mensaje es un Embed enviado por el bot Raid Helper
    if (message.author.bot && message.embeds.length > 0) {
        const embed = message.embeds[0];
        
        // El bot reaccionará si el título del mensaje contiene la palabra 'Raid' o 'Evento'
        if (embed.title) {
            const groupId = process.env.WHATSAPP_GROUP_ID;
            
            if (groupId && groupId !== 'temporal') {
                const titulo = embed.title;
                const descripcion = embed.description || 'Sin descripción adicional';
                
                // Formatear el mensaje bonito para WhatsApp
                const textoAlerta = `📢 *¡ALERTA DE RAID DE DISCORD!*\n\n*Evento:* ${titulo}\n\n*Detalles:* ${descripcion}`;
                
                try {
                    await whatsappClient.sendMessage(groupId, textoAlerta);
                    console.log(`[Éxito] Alerta de Raid enviada al grupo de WhatsApp.`);
                } catch (err) {
                    console.error('[Error] No se pudo enviar el mensaje a WhatsApp:', err);
                }
            }
        }
    }
});

// Inicializar el cliente de WhatsApp
whatsappClient.initialize();
