const isAdmin = require('../lib/isAdmin');

async function muteCommand(sock, chatId, senderId, message, durationInMinutes) {
    try {
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
        
        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ *الرجاء جعل البوت مشرفاً أولاً لاستخدام أمر الكتم.*' 
            }, { quoted: message });
            return;
        }

        if (!isSenderAdmin && !message.key.fromMe) {
            await sock.sendMessage(chatId, { 
                text: '⛔ *غير مصرح!*\n👑 فقط مشرفي المجموعة يمكنهم استخدام أمر الكتم.' 
            }, { quoted: message });
            return;
        }

        // إظهار تفاعل "جاري الكتم"
        await sock.sendMessage(chatId, {
            react: { text: '🔇', key: message.key }
        });

        // كتم المجموعة
        await sock.groupSettingUpdate(chatId, 'announcement');
        
        if (durationInMinutes !== undefined && durationInMinutes > 0) {
            const durationInMilliseconds = durationInMinutes * 60 * 1000;
            const muteMessage = `╭━━━≪•🔇 *كـتـم الـمـجـمـوعـة* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🔒 *تم كتم المجموعة لمدة ${durationInMinutes} دقيقة*
┃👑 *بواسطة:* @${senderId.split('@')[0]}
┃━━━━━━━━━━━━━━━━━━━━━
┃💬 *الآن، المشرفون فقط يمكنهم الكلام*
┃⏰ *سيتم فتح المجموعة تلقائياً بعد ${durationInMinutes} دقيقة*
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
            
            await sock.sendMessage(chatId, { 
                text: muteMessage,
                mentions: [senderId]
            }, { quoted: message });
            
            // إلغاء الكتم بعد المدة المحددة
            setTimeout(async () => {
                try {
                    await sock.groupSettingUpdate(chatId, 'not_announcement');
                    const unmuteMessage = `╭━━━≪•🔓 *فـتـح الـمـجـمـوعـة* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃✅ *تم فتح المجموعة تلقائياً بعد ${durationInMinutes} دقيقة*
┃💬 *يمكن للأعضاء الآن إرسال الرسائل*
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
                    await sock.sendMessage(chatId, { text: unmuteMessage });
                } catch (unmuteError) {
                    console.error('خطأ في فتح المجموعة:', unmuteError);
                }
            }, durationInMilliseconds);
        } else {
            const muteMessage = `╭━━━≪•🔇 *كـتـم الـمـجـمـوعـة* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🔒 *تم كتم المجموعة!*
┃👑 *بواسطة:* @${senderId.split('@')[0]}
┃━━━━━━━━━━━━━━━━━━━━━
┃💬 *الآن، المشرفون فقط يمكنهم الكلام*
┃📌 *لاستعادة الكلام، استخدم .فتح*
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
            
            await sock.sendMessage(chatId, { 
                text: muteMessage,
                mentions: [senderId]
            }, { quoted: message });
        }

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في كتم المجموعة:', error);
        
        let errorMessage = '❌ *حدث خطأ!*\n⚠️ تعذر كتم المجموعة. يرجى المحاولة لاحقاً.';
        
        if (error.message && error.message.includes('rate')) {
            errorMessage = '⏳ *تم الوصول للحد الأقصى!*\n⚠️ يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
    }
}

module.exports = muteCommand;