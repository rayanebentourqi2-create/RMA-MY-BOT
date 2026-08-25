async function shipCommand(sock, chatId, msg, groupMetadata) {
    try {
        // التحقق من أنها مجموعة
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ هذا الأمر يمكن استخدامه فقط في المجموعات!'
            }, { quoted: msg });
            return;
        }

        // إظهار تفاعل "جاري الحساب"
        await sock.sendMessage(chatId, {
            react: { text: '💕', key: msg.key }
        });

        // الحصول على جميع أعضاء المجموعة
        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants.map(v => v.id);
        
        if (participants.length < 2) {
            await sock.sendMessage(chatId, { 
                text: '❌ *لا يوجد عدد كافٍ من الأعضاء!*\n👥 تحتاج المجموعة إلى عضوين على الأقل.'
            }, { quoted: msg });
            return;
        }

        let firstUser, secondUser;
        
        // التحقق من وجود منشن أو رد
        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
        
        if (mentionedJid.length >= 2) {
            // إذا تم منشن شخصين
            firstUser = mentionedJid[0];
            secondUser = mentionedJid[1];
        } else if (mentionedJid.length === 1 && quotedParticipant) {
            // إذا تم منشن شخص والرد على شخص آخر
            firstUser = mentionedJid[0];
            secondUser = quotedParticipant;
        } else if (mentionedJid.length === 1) {
            // إذا تم منشن شخص واحد، اختيار شخص عشوائي آخر
            firstUser = mentionedJid[0];
            do {
                secondUser = participants[Math.floor(Math.random() * participants.length)];
            } while (secondUser === firstUser);
        } else if (quotedParticipant) {
            // إذا تم الرد على رسالة شخص، اختيار شخص عشوائي آخر
            firstUser = quotedParticipant;
            do {
                secondUser = participants[Math.floor(Math.random() * participants.length)];
            } while (secondUser === firstUser);
        } else {
            // اختيار شخصين عشوائيين
            firstUser = participants[Math.floor(Math.random() * participants.length)];
            do {
                secondUser = participants[Math.floor(Math.random() * participants.length)];
            } while (secondUser === firstUser);
        }

        // حساب نسبة الحب (عشوائية بين 0 و 100)
        const lovePercentage = Math.floor(Math.random() * 101);
        
        // تحديد الرموز حسب النسبة
        let emoji = '💔';
        let status = 'لا توجد مشاعر';
        
        if (lovePercentage >= 90) {
            emoji = '💖💖💖';
            status = 'حب أبدي! 💕';
        } else if (lovePercentage >= 70) {
            emoji = '💖💖';
            status = 'حب قوي جداً! 💗';
        } else if (lovePercentage >= 50) {
            emoji = '💖';
            status = 'حب متوسط 💓';
        } else if (lovePercentage >= 30) {
            emoji = '💕';
            status = 'هناك مشاعر بسيطة 💕';
        } else if (lovePercentage >= 10) {
            emoji = '💗';
            status = 'فرصة ضعيفة 💔';
        } else {
            emoji = '💔';
            status = 'لا توجد مشاعر 💔';
        }

        // محاولة الحصول على أسماء المستخدمين
        let firstName = firstUser.split('@')[0];
        let secondName = secondUser.split('@')[0];
        
        try {
            const firstContact = await sock.getBusinessProfile(firstUser);
            if (firstContact && firstContact.name) firstName = firstContact.name;
        } catch(e) {}
        
        try {
            const secondContact = await sock.getBusinessProfile(secondUser);
            if (secondContact && secondContact.name) secondName = secondContact.name;
        } catch(e) {}

        const resultMessage = `╭━━━≪•💕 *نـسـبـة الـحـب* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃👫 *بين:*
┃   💑 @${firstUser.split('@')[0]}
┃   ❤️  @${secondUser.split('@')[0]}
┃━━━━━━━━━━━━━━━━━━━━━
┃📊 *نسبة التوافق:* ${lovePercentage}% ${emoji}
┃📝 *الحالة:* ${status}
┃━━━━━━━━━━━━━━━━━━━━━
┃💡 ${lovePercentage >= 70 ? 'مبروك! يبدو أن هناك نصيب بينكما! 🎉' : (lovePercentage >= 40 ? 'هناك فرصة، جرب حظك! 🍀' : 'ربما ليس الآن، لكن من يدري بالمستقبل! 🤷')}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        await sock.sendMessage(chatId, {
            text: resultMessage,
            mentions: [firstUser, secondUser]
        }, { quoted: msg });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: msg.key }
        });

    } catch (error) {
        console.error('خطأ في أمر نسبة الحب:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ *فشل حساب نسبة الحب!*\n⚠️ تأكد من أن البوت لا يزال في المجموعة.'
        }, { quoted: msg });
    }
}

module.exports = shipCommand;