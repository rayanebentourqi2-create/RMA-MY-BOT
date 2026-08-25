async function unmuteCommand(sock, chatId, senderId) {
    try {
        // تغيير إعدادات المجموعة إلى غير مُعلنة (فتح المجموعة)
        await sock.groupSettingUpdate(chatId, 'not_announcement');
        
        // إرسال رسالة تأكيد الفتح
        const message = `╭━━━≪•🔓 *فـتـح الـمـجـمـوعـة* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃✨ *تم فتح المجموعة بنجاح!*
┃━━━━━━━━━━━━━━━━━━━━━
┃💬 *يمكن للأعضاء الآن إرسال الرسائل*
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        await sock.sendMessage(chatId, { text: message });
        
    } catch (error) {
        console.error('خطأ في فتح المجموعة:', error);
        
        let errorMessage = '❌ *حدث خطأ!*\n\n⚠️ تعذر فتح المجموعة. تأكد من أن البوت مشرف في المجموعة.';
        
        if (error.message && error.message.includes('not-authorized')) {
            errorMessage = '❌ *غير مصرح!*\n\n⚠️ البوت ليس مشرفاً في هذه المجموعة. الرجاء جعل البوت مشرفاً أولاً.';
        }
        
        await sock.sendMessage(chatId, { text: errorMessage });
    }
}

module.exports = unmuteCommand;