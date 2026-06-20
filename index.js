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

whatsappClient.on('ready', () => {
    console.log('¡WhatsApp conectado exitosamente!');
    discordClient.login(process.env.DISCORD_TOKEN);
});

whatsappClient.on('qr', (qr) => {
    console.log('--- ESCANEA ESTE CÓDIGO QR EN TU CELULAR ---');
    qrcode.generate(qr, { small: true });
});

discordClient.on('ready', () => {
    console.log(`Bot de Discord conectado como ${discordClient.user.tag}`);
});

// Lógica de lectura de mensajes de Discord y reenvío a WhatsApp
discordClient.on('messageCreate', async (message) => {
    const canalesPermitidos = (process.env.DISCORD_CHANNEL_ID || '').split(',');
    if (!canalesPermitidos.includes(message.channelId)) return;

    // Verificar si el mensaje es de Raid Helper
    if (message.author.bot && message.embeds.length > 0) {
        const embed = message.embeds[0];
        if (embed.title && embed.title.includes('Raid')) {
            const groupId = process.env.WHATSAPP_GROUP_ID;
            const guildId = process.env.DISCORD_GUILD_ID;
            
            if (groupId && groupId !== 'temporal') {
                // Construir el enlace directo al mensaje de Discord
                const discordLink = `https://discord.com/channels/${guildId || '0'}/${message.channelId}/${message.id}`;
                
                const textoAlerta = `📢 *¡Nueva Raid Programada!*\n\n*Título:* ${embed.title}\n*Descripción:* ${embed.description || 'Sin descripción'}\n\n📍 *Inscríbete aquí en Discord:* \n${discordLink}`;
                
                whatsappClient.sendMessage(groupId, textoAlerta);
                console.log('Alerta de Raid enviada a WhatsApp con enlace directo');
            }
        }
    }
});

// Arrancar el cliente de WhatsApp
whatsappClient.initialize();


