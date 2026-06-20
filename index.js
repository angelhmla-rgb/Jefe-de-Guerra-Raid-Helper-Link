const { Client: DiscordClient, GatewayIntentBits } = require('discord.js');
const { Client: WhatsAppClient, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Variable candado para asegurar que WhatsApp cargó por completo
let whatsappListo = false;

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

whatsappClient.on('ready', () => {
    console.log('¡WhatsApp conectado exitosamente y listo para enviar mensajes!');
    whatsappListo = true; // Abrimos el candado
    discordClient.login(process.env.DISCORD_TOKEN);
});

whatsappClient.on('qr', (qr) => {
    console.log('--- ESCANEA ESTE CÓDIGO QR EN TU CELULAR ---');
    qrcode.generate(qr, { small: true });
});

discordClient.on('ready', () => {
    console.log(`Bot de Discord conectado como ${discordClient.user.tag}`);
});

// Lógica de lectura de mensajes de Discord y reenvío a WhatsApp (Multi-grupo)
discordClient.on('messageCreate', async (message) => {
    const canalesPermitidos = (process.env.DISCORD_CHANNEL_ID || '').split(',');
    
    if (!canalesPermitidos.includes(message.channelId)) return;

    console.log(`[Discord] Mensaje detectado en canal permitido. Autor: ${message.author.tag} (Bot: ${message.author.bot})`);

    // Verificar si el mensaje contiene un embed (tarjeta de Raid Helper)
    if (message.embeds.length > 0) {
        const embed = message.embeds[0];
        console.log(`[Discord] Embed encontrado. Título: "${embed.title || 'Sin Título'}"`);

        if (message.author.bot) {
            // SI WHATSAPP NO ESTÁ LISTO TODAVÍA, ESPERAMOS 5 SEGUNDOS
            if (!whatsappListo) {
                console.log('[WhatsApp] Esperando 5 segundos a que WhatsApp termine de inicializar...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                if (!whatsappListo) {
                    console.log('[WhatsApp] Conexión aún no lista. Alerta cancelada para evitar crasheo.');
                    return;
                }
            }

            const gidsPermitidos = (process.env.WHATSAPP_GROUP_ID || '').split(',');
            const guildId = process.env.DISCORD_GUILD_ID;
            
            // Construir el enlace directo al mensaje de Discord
            const discordLink = `https://discord.com/channels/${guildId || '0'}/${message.channelId}/${message.id}`;
            
            const textoAlerta = `📢 *¡Nueva Raid Programada!*\n\n*Título:* ${embed.title || 'Evento de la Hermandad'}\n*Descripción:* ${embed.description || 'Sin descripción'}\n\n📍 *Inscríbete aquí en Discord:* \n${discordLink}`;

            // Enviar el mensaje a cada uno de los grupos configurados
            gidsPermitidos.forEach(groupId => {
                const cleanId = groupId.trim();
                if (cleanId && cleanId !== 'temporal') {
                    whatsappClient.sendMessage(cleanId, textoAlerta)
                        .then(() => console.log(`[WhatsApp] ¡Alerta enviada con éxito al grupo: ${cleanId}!`))
                        .catch(err => console.error(`[WhatsApp] Error al enviar al grupo ${cleanId}:`, err));
                }
            });
        }
    }
});

// Arrancar el cliente de WhatsApp
whatsappClient.initialize();


