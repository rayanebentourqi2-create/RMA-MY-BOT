const isAdmin = require('../lib/isAdmin');

async function tagAllCommand(sock, chatId, senderId, message) {
    try {
        // التحقق من صلاحيات البوت والمستخدم
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ *الرجاء جعل البوت مشرفاً أولاً!*\n🔧 لا يمكن استخدام أمر منشن الجميع دون صلاحيات المشرف.'
            }, { quoted: message });
            return;
        }

        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { 
                text: '⛔ *غير مصرح!*\n👑 فقط مشرفي المجموعة يمكنهم استخدام أمر منشن الجميع.'
            }, { quoted: message });
            return;
        }

        // إظهار تفاعل "جاري المعالجة"
        await sock.sendMessage(chatId, {
            react: { text: '📢', key: message.key }
        });

        // الحصول على معلومات المجموعة
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;
        const groupName = groupMetadata.subject;
        const adminCount = participants.filter(p => p.admin).length;
        const memberCount = participants.length;

        if (!participants || participants.length === 0) {
            await sock.sendMessage(chatId, { 
                text: '❌ *لا يوجد أعضاء!*\n⚠️ لم يتم العثور على أعضاء في هذه المجموعة.'
            });
            return;
        }

        // إنشاء رسالة المنشن
        let mentionList = '';
        participants.forEach(participant => {
            mentionList += `┃ @${participant.id.split('@')[0]}\n`;
        });

        const messageText = `╭━━━≪•📢 *مـنـشـن الـجـمـيـع* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃👥 *المجموعة:* ${groupName}
┃👑 *عدد المشرفين:* ${adminCount}
┃👤 *عدد الأعضاء:* ${memberCount}
┃👤 *تم التنبيه بواسطة:* @${senderId.split('@')[0]}
┃━━━━━━━━━━━━━━━━━━━━━
┃📢 *الأعضاء:*
┃━━━━━━━━━━━━━━━━━━━━━
${mentionList}
┃━━━━━━━━━━━━━━━━━━━━━
┃💡 *تنبيه:* يرجى قراءة القوانين والالتزام بها
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        // إرسال الرسالة مع المنشن
        await sock.sendMessage(chatId, {
            text: messageText,
            mentions: [senderId, ...participants.map(p => p.id)]
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر منشن الجميع:', error);
        
        let errorMessage = '❌ *حدث خطأ!*\n⚠️ تعذر إرسال منشن الجميع. يرجى المحاولة لاحقاً.';
        
        if (error.message && error.message.includes('rate')) {
            errorMessage = '⏳ *تم الوصول للحد الأقصى!*\n⚠️ يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.';
        } else if (error.message && error.message.includes('timeout')) {
            errorMessage = '⏰ *انتهى الوقت!*\n⚠️ المجموعة كبيرة جداً، قد يستغرق الأمر بعض الوقت.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
    }
}

module.exports = tagAllCommand;