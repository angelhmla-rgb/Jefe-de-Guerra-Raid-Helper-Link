// CÓDIGO PARA LISTAR TODOS LOS GRUPOS AL INICIAR
whatsappClient.on('ready', async () => {
    console.log('--- BUSCANDO TUS GRUPOS Y COMUNIDADES ---');
    const chats = await whatsappClient.getChats();
    const grupos = chats.filter(chat => chat.isGroup);
    
    grupos.forEach(g => {
        console.log(`[GRUPO ENCONTRADO] Nombre: ${g.name} | ID: ${g.id._serialized}`);
    });
    console.log('-----------------------------------------');
});
