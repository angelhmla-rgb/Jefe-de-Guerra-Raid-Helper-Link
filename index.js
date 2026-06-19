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

// ====================================================
// TRUCO DETECTOR: LISTAR TODOS LOS GRUPOS AL INICIAR
// ====================================================
whatsappClient.on('ready', async () => {
    console.log('¡WhatsApp conectado exitosamente!');
    console.log('--- BUSCANDO TUS GRUPOS Y COMUNIDADES ---');
    
    try {
        const chats = await whatsappClient.getChats();
        const grupos = chats.filter(chat => chat.isGroup);
        
        grupos.forEach(g => {
            console.log(`[GRUPO ENCONTRADO] Nombre: ${g.name} | ID: ${g.id._serialized}`);
        });
    } catch (error) {
        console.error('Error al listar los grupos:', error);
    }
    
    console.log('-----------------------------------------');
    
    // Iniciar Discord una vez que WhatsApp está listo
    discordClient.login(process.env.DISCORD_TOKEN);
});

// Mostrar el QR si por alguna razón se llega a desvincular
whatsappClient.on('qr', (qr) => {
    console.log('--- ESCANEA ESTE CÓDIGO QR EN TU CELULAR ---');
    qrcode.generate(qr, { small: true });
});

discordClient.on('ready', () => {
    console.log(`Bot de Discord conectado como ${discordClient.user.tag}`);
});

// Lógica de lectura de mensajes de Discord
discordClient.on('messageCreate', async (message) => {
    const canalesPermitidos = (process.env.DISCORD_CHANNEL_ID || '').split(',');
    if (!canalesPermitidos.includes(message.channelId)) return;

    // Verificar si el mensaje es de Raid Helper
    if (message.author.bot && message.embeds.length > 0) {
        const embed = message.embeds[0];
        if (embed.title && embed.title.includes('Raid')) {
            const groupId = process.env.WHATSAPP_GROUP_ID;
            if (groupId && groupId !== 'temporal') {
                const textoAlerta = `📢 *¡Nueva Raid Programada!*\n\n*Título:* ${embed.title}\n*Descripción:* ${embed.description || 'Sin descripción'}`;
                whatsappClient.sendMessage(groupId, textoAlerta);
                console.log('Alerta de Raid enviada a WhatsApp');
            }
        }
    }
});

// Arrancar el cliente de WhatsApp
whatsappClient.initialize();
