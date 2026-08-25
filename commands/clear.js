async function clearCommand(sock, chatId, message) {
    try {
        // التحقق من أن المستخدم مشرف (إذا كان في مجموعة)
        const isGroup = chatId.endsWith('@g.us');
        if (isGroup) {
            const senderId = message.key.participant || message.key.remoteJid;
            const { isSenderAdmin, isBotAdmin } = await require('../lib/isAdmin')(sock, chatId, senderId);
            
            if (!isBotAdmin) {
                await sock.sendMessage(chatId, { 
                    text: '⚠️ *الرجاء جعل البوت مشرفاً أولاً!*',
                    quoted: message
                });
                return;
            }
            
            if (!isSenderAdmin && !message.key.fromMe) {
                await sock.sendMessage(chatId, { 
                    text: '⛔ *غير مصرح!*\n👑 فقط مشرفي المجموعة يمكنهم استخدام هذا الأمر.',
                    quoted: message
                });
                return;
            }
        }

        // إظهار تفاعل "جاري التنظيف"
        await sock.sendMessage(chatId, {
            react: { text: '🧹', key: message.key }
        });

        // إرسال رسالة مؤقتة ثم حذفها
        const tempMsg = await sock.sendMessage(chatId, { 
            text: '🧹 *جاري تنظيف الرسائل...*',
            quoted: message
        });
        
        // حذف الرسالة المؤقتة
        await sock.sendMessage(chatId, { delete: tempMsg.key });
        
        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });
        
    } catch (error) {
        console.error('خطأ في مسح الرسائل:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ *حدث خطأ!*\n⚠️ تعذر مسح الرسائل. يرجى المحاولة لاحقاً.',
            quoted: message
        });
    }
}

module.exports = { clearCommand };