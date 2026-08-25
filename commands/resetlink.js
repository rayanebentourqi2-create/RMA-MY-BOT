async function resetlinkCommand(sock, chatId, senderId, message) {
    try {
        // التحقق من أنها مجموعة
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ هذا الأمر يمكن استخدامه فقط في المجموعات!'
            }, { quoted: message });
            return;
        }

        // التحقق من صلاحيات المرسل
        const groupMetadata = await sock.groupMetadata(chatId);
        const isAdmin = groupMetadata.participants
            .filter(p => p.admin)
            .map(p => p.id)
            .includes(senderId);

        // التحقق من صلاحيات البوت
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants
            .filter(p => p.admin)
            .map(p => p.id)
            .includes(botId);

        if (!isAdmin && !message.key.fromMe) {
            await sock.sendMessage(chatId, { 
                text: '⛔ *غير مصرح!*\n👑 فقط مشرفي المجموعة يمكنهم استخدام هذا الأمر!'
            }, { quoted: message });
            return;
        }

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ *الرجاء جعل البوت مشرفاً أولاً لإعادة تعيين رابط المجموعة!'
            }, { quoted: message });
            return;
        }

        // إظهار تفاعل "جاري المعالجة"
        await sock.sendMessage(chatId, {
            react: { text: '🔄', key: message.key }
        });

        // إعادة تعيين رابط المجموعة
        const newCode = await sock.groupRevokeInvite(chatId);
        
        // إرسال الرابط الجديد
        const resultMessage = `╭━━━≪•🔄 *إعـادة تـعـيـيـن الـرابـط* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃✅ *تم إعادة تعيين رابط المجموعة بنجاح!*
┃━━━━━━━━━━━━━━━━━━━━━
┃🔗 *الرابط الجديد:*
┃https://chat.whatsapp.com/${newCode}
┃━━━━━━━━━━━━━━━━━━━━━
┃💡 *تم تعطيل الرابط القديم بشكل تلقائي*
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        await sock.sendMessage(chatId, { 
            text: resultMessage
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في إعادة تعيين رابط المجموعة:', error);
        
        let errorMessage = '❌ *فشل إعادة تعيين رابط المجموعة!*\n';
        
        if (error.message && error.message.includes('not-authorized')) {
            errorMessage += '⚠️ *البوت ليس مشرفاً!*\nالرجاء جعل البوت مشرفاً ثم المحاولة مرة أخرى.';
        } else {
            errorMessage += '⚠️ يرجى المحاولة لاحقاً.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
    }
}

module.exports = resetlinkCommand;