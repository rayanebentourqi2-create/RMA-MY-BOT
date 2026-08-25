async function staffCommand(sock, chatId, msg, message) {
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
            react: { text: '👑', key: message.key }
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
        
        if (groupAdmins.length === 0) {
            await sock.sendMessage(chatId, { 
                text: '👑 *لا يوجد مشرفون في هذه المجموعة!*\n📌 استخدم أمر الترقية لإضافة مشرفين.'
            }, { quoted: message });
            return;
        }
        
        // فصل المشرفين إلى سوبر مشرفين ومشرفين عاديين
        const superAdmins = groupAdmins.filter(p => p.admin === 'superadmin');
        const regularAdmins = groupAdmins.filter(p => p.admin === 'admin');
        
        let listAdmin = '';
        let counter = 1;
        
        if (superAdmins.length > 0) {
            listAdmin += `┃\n┃ 👑 *المالك/سوبر مشرف:*\n`;
            superAdmins.forEach(admin => {
                listAdmin += `┃   ${counter++}. @${admin.id.split('@')[0]}\n`;
            });
        }
        
        if (regularAdmins.length > 0) {
            listAdmin += `┃\n┃ 🛡️ *المشرفون:*\n`;
            regularAdmins.forEach(admin => {
                listAdmin += `┃   ${counter++}. @${admin.id.split('@')[0]}\n`;
            });
        }
        
        // الحصول على مالك المجموعة
        const owner = groupMetadata.owner || superAdmins[0]?.id || chatId.split('-')[0] + '@s.whatsapp.net';
        const groupName = groupMetadata.subject;
        const memberCount = participants.length;
        const adminCount = groupAdmins.length;

        // إنشاء نص المشرفين
        const text = `╭━━━≪•👑 *قـائـمـة الـمـشـرفـيـن* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃👥 *المجموعة:* ${groupName}
┃👤 *عدد الأعضاء:* ${memberCount}
┃👑 *عدد المشرفين:* ${adminCount}
┃━━━━━━━━━━━━━━━━━━━━━
${listAdmin}
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
        console.error('خطأ في أمر قائمة المشرفين:', error);
        
        let errorMessage = '❌ *فشل جلب قائمة المشرفين!*\n⚠️ تأكد من أن البوت لا يزال في المجموعة.';
        
        if (error.message && error.message.includes('rate')) {
            errorMessage = '⏳ *تم الوصول للحد الأقصى!*\n⚠️ يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
    }
}

module.exports = staffCommand;