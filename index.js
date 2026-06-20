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

// 2. CONFIGURACIÓN DE WHATSAPP (CON PARÁMETROS AGRESIVOS DE MEMORIA)
const whatsappClient = new WhatsAppClient({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: '/usr/bin/google-chrome-stable',
        protocolTimeout: 0, // Desactiva por completo el límite de tiempo de Puppeteer
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--unhandled-rejections=strict',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process'
        ]
    }
});

// CUANDO WHATSAPP CONECTA CON ÉXITO
whatsappClient.on('ready', () => {
    console.log('¡WhatsApp conectado exitosamente y listo para enviar alertas!');
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
            
            // INTENTO DE ENVIAR CON REINTENTOS MANUALES PARA EVITAR EL TIMEOUT
            let enviado = false;
            let intentos = 0;
            
            while (!enviado && intentos < 3) {
                try {
                    intentos++;
                    console.log(`[WhatsApp] Intentando enviar mensaje (Intento ${intentos})...`);
                    
                    // Aseguramos el formato correcto del ID del grupo
                    const formattedGroupId = groupId.includes('@g.us') ? groupId : `${groupId}@g.us`;
                    
                    await whatsappClient.sendMessage(formattedGroupId, textoAlerta);
                    console.log(`[Éxito] Alerta de Raid enviada al grupo de WhatsApp.`);
                    enviado = true;
                } catch (err) {
                    console.error(`[Error] Intento ${intentos} falló:`, err.message);
                    if (intentos < 3) {
                        console.log('Esperando 5 segundos antes de reintentar...');
                        await new Promise(resolve => setTimeout(resolve, 5000)); // Pausa de estabilidad
                    } else {
                        console.error('[Error Crítico] No se pudo enviar tras 3 intentos.');
                    }
                }
            }
        }
    }
});

whatsappClient.initialize();

