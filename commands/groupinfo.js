async function groupInfoCommand(sock, chatId, msg, message) {
    try {
        // التحقق من أنها مجموعة
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ هذا الأمر يمكن استخدامه فقط في المجموعات!'
            }, { quoted: message });
            return;
        }

        // إظهار تفاعل "جاري التحميل"
        await sock.sendMessage(chatId, {
            react: { text: '📊', key: message.key }
        });

        // جلب معلومات المجموعة
        const groupMetadata = await sock.groupMetadata(chatId);
        
        // جلب صورة المجموعة
        let pp;
        try {
            pp = await sock.profilePictureUrl(chatId, 'image');
        } catch {
            pp = 'https://i.imgur.com/2wzGhpF.jpeg'; // صورة افتراضية
        }

        // جلب المشرفين من المشاركين
        const participants = groupMetadata.participants;
        const groupAdmins = participants.filter(p => p.admin);
        const listAdmin = groupAdmins.map((v, i) => `┃ ${i + 1}. @${v.id.split('@')[0]}`).join('\n');
        
        // جلب مالك المجموعة
        const owner = groupMetadata.owner || groupAdmins.find(p => p.admin === 'superadmin')?.id || chatId.split('-')[0] + '@s.whatsapp.net';

        // الحصول على تاريخ الإنشاء (تقديري)
        const creationDate = new Date(parseInt(chatId.split('@')[0])).toLocaleDateString('ar-EG') || 'غير معروف';

        // إنشاء نص المعلومات
        const text = `╭━━━≪•📊 *مـعـلـومـات الـمـجـمـوعـة* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🆔 *الرقم التعريفي:* 
┃   ${groupMetadata.id}
┃━━━━━━━━━━━━━━━━━━━━━
┃📛 *الاسم:* 
┃   ${groupMetadata.subject}
┃━━━━━━━━━━━━━━━━━━━━━
┃👥 *عدد الأعضاء:* 
┃   ${participants.length} عضو/عضوة
┃━━━━━━━━━━━━━━━━━━━━━
┃👑 *المالك:* 
┃   @${owner.split('@')[0]}
┃━━━━━━━━━━━━━━━━━━━━━
┃🛡️ *المشرفون:* 
${listAdmin || '┃   لا يوجد مشرفون'}
┃━━━━━━━━━━━━━━━━━━━━━
┃📝 *الوصف:* 
┃   ${groupMetadata.desc?.toString() || 'لا يوجد وصف'}
┃━━━━━━━━━━━━━━━━━━━━━
┃📅 *تاريخ الإنشاء:* 
┃   ${creationDate}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        // إرسال الرسالة مع الصورة والإشارات
        await sock.sendMessage(chatId, {
            image: { url: pp },
            caption: text,
            mentions: [...groupAdmins.map(v => v.id), owner]
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر معلومات المجموعة:', error);
        
        let errorMessage = '❌ *فشل جلب معلومات المجموعة!*\n⚠️ تأكد من أن البوت لا يزال في المجموعة.';
        
        if (error.message && error.message.includes('rate')) {
            errorMessage = '⏳ *تم الوصول للحد الأقصى!*\n⚠️ يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
    }
}

module.exports = groupInfoCommand;