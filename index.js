const { Client: DiscordClient, GatewayIntentBits } = require('discord.js');
const { Client: WhatsAppClient, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let whatsappListo = false;

const discordClient = new DiscordClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// CONFIGURACIÓN CON PERSISTENCIA ACTIVADA
const whatsappClient = new WhatsAppClient({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth' 
    }),
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
    whatsappListo = true;
    discordClient.login(process.env.DISCORD_TOKEN);
});

whatsappClient.on('qr', (qr) => {
    console.log('--- ESCANEA ESTE CÓDIGO QR EN TU CELULAR ---');
    qrcode.generate(qr, { small: true });
});

discordClient.on('ready', () => {
    console.log(`Bot de Discord conectado como ${discordClient.user.tag}`);
});

discordClient.on('messageCreate', async (message) => {
    const canalesPermitidos = (process.env.DISCORD_CHANNEL_ID || '').split(',');
    
    if (!canalesPermitidos.includes(message.channelId)) return;

    console.log(`[Discord] Mensaje detectado en canal permitido. Autor: ${message.author.tag} (Bot: ${message.author.bot})`);

    if (message.embeds.length > 0) {
        const embed = message.embeds[0];
        console.log(`[Discord] Embed encontrado. Título: "${embed.title || 'Sin Título'}"`);

        if (message.author.bot) {
            if (!whatsappListo) {
                console.log('[WhatsApp] Esperando 5 segundos a que WhatsApp termine de inicializar...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                if (!whatsappListo) return;
            }

            const gidsPermitidos = (process.env.WHATSAPP_GROUP_ID || '').split(',');
            const guildId = process.env.DISCORD_GUILD_ID;
            
            const discordLink = `https://discord.com/channels/${guildId || '0'}/${message.channelId}/${message.id}`;
            const textoAlerta = `📢 *¡Nueva Raid Programada!*\n\n*Título:* ${embed.title || 'Evento de la Hermandad'}\n*Descripción:* ${embed.description || 'Sin descripción'}\n\n📍 *Inscríbete aquí en Discord:* \n${discordLink}`;

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

whatsappClient.initialize();

