const isAdmin = require('../lib/isAdmin');

async function tagNotAdminCommand(sock, chatId, senderId, message) {
    try {
        // التحقق من صلاحيات البوت والمستخدم
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ *الرجاء جعل البوت مشرفاً أولاً!*\n🔧 لا يمكن استخدام هذا الأمر دون صلاحيات المشرف.'
            }, { quoted: message });
            return;
        }

        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { 
                text: '⛔ *غير مصرح!*\n👑 فقط مشرفي المجموعة يمكنهم استخدام أمر منشن غير المشرفين.'
            }, { quoted: message });
            return;
        }

        // إظهار تفاعل "جاري المعالجة"
        await sock.sendMessage(chatId, {
            react: { text: '📢', key: message.key }
        });

        // الحصول على معلومات المجموعة
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants || [];
        const groupName = groupMetadata.subject;

        // تصفية الأعضاء غير المشرفين
        const nonAdmins = participants.filter(p => !p.admin).map(p => p.id);
        
        if (nonAdmins.length === 0) {
            await sock.sendMessage(chatId, { 
                text: '📢 *لا يوجد أعضاء غير مشرفين!*\n✨ جميع أعضاء المجموعة هم مشرفون.'
            }, { quoted: message });
            return;
        }

        // إنشاء رسالة المنشن
        let mentionList = '';
        nonAdmins.forEach(jid => {
            mentionList += `┃ @${jid.split('@')[0]}\n`;
        });

        const text = `╭━━━≪•📢 *مـنـشـن غـيـر الـمـشـرفـيـن* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃👥 *المجموعة:* ${groupName}
┃👤 *تم التنبيه بواسطة:* @${senderId.split('@')[0]}
┃━━━━━━━━━━━━━━━━━━━━━
┃👥 *الأعضاء غير المشرفين:* (${nonAdmins.length})
┃━━━━━━━━━━━━━━━━━━━━━
${mentionList}
┃━━━━━━━━━━━━━━━━━━━━━
┃💡 *تنبيه:* يرجى الالتزام بقوانين المجموعة
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        await sock.sendMessage(chatId, { 
            text, 
            mentions: [senderId, ...nonAdmins]
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر منشن غير المشرفين:', error);
        
        let errorMessage = '❌ *حدث خطأ!*\n⚠️ تعذر إرسال منشن غير المشرفين. يرجى المحاولة لاحقاً.';
        
        if (error.message && error.message.includes('rate')) {
            errorMessage = '⏳ *تم الوصول للحد الأقصى!*\n⚠️ يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
    }
}

module.exports = tagNotAdminCommand;