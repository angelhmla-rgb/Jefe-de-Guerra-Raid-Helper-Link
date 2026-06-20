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

// 2. CONFIGURACIÓN DE WHATSAPP (ESTABLE PARA PLAN HOBBY)
const whatsappClient = new WhatsAppClient({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: '/usr/bin/google-chrome-stable',
        handleSIGINT: false,
        handleSIGTERM: false,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    }
});

// CUANDO WHATSAPP CONECTA CON ÉXITO (MUESTRA LOS ID DE TUS GRUPOS)
whatsappClient.on('ready', async () => {
    console.log('¡WhatsApp conectado exitosamente y listo para enviar alertas!');
    
    try {
        console.log('--- BUSCANDO TUS GRUPOS ACTIVOS ---');
        const chats = await whatsappClient.getChats();
        const grupos = chats.filter(chat => chat.isGroup);
        
        grupos.forEach(grupo => {
            console.log(`GRUPO: "${grupo.name}" | ID: ${grupo.id._serialized}`);
        });
        console.log('-----------------------------------');
    } catch (err) {
        console.error('Error al enlistar grupos:', err.message);
    }

    discordClient.login(process.env.DISCORD_TOKEN);
});

// MOSTRAR QR SI ES NECESARIO
whatsappClient.on('qr', (qr) => {
    console.log('--- ESCANEA ESTE CÓDIGO QR EN TU CELULAR ---');
    qrcode.generate(qr, { small: true });
});

discordClient.on('ready', () => {
    console.log(`Bot de Discord conectado como ${discordClient.user.tag}`);
});

// ESCUCHAR CANALES DE DISCORD
discordClient.on('messageCreate', async (message) => {
    const canalesPermitidos = (process.env.DISCORD_CHANNEL_ID || '').split(',').map(id => id.trim());
    
    if (!canalesPermitidos.includes(message.channelId)) return;

    if (message.author.bot && message.embeds.length > 0) {
        const embed = message.embeds[0];
        
        if (embed.title) {
            const groupId = process.env.WHATSAPP_GROUP_ID;
            if (!groupId || groupId === 'temporal') return;

            const titulo = embed.title;
            const descripcion = embed.description || 'Sin descripción adicional';
            const textoAlerta = `📢 *¡ALERTA DE RAID DE DISCORD!*\n\n*Evento:* ${titulo}\n\n*Detalles:* ${descripcion}`;
            
            try {
                console.log(`[WhatsApp] Enviando mensaje a WhatsApp...`);
                const formattedGroupId = groupId.includes('@g.us') ? groupId : `${groupId}@g.us`;
                
                await whatsappClient.sendMessage(formattedGroupId, textoAlerta);
                console.log(`[Éxito] Alerta de Raid enviada al grupo de WhatsApp.`);
            } catch (err) {
                console.error(`[Error] No se pudo enviar el mensaje:`, err.message);
            }
        }
    }
});

whatsappClient.initialize();

