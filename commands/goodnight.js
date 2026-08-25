const fetch = require('node-fetch');

// قائمة رسائل "تصبح على خير" احتياطية بالعربية
const backupGoodnightMessages = [
    "🌙 تصبح على خير.. أحلاماً سعيدة! 💫",
    "⭐ ليلة هادئة ونوم عميق.. تصبح على خير! 🌙",
    "💤 أغمض عينيك ودع الأحلام تأخذك.. تصبح على خير! 🌟",
    "🌜 قمرك سعيد وليلك هادئ.. تصبح على خير! ✨",
    "😴 حان وقت الراحة.. تصبح على خير وصباحك مشرق! 🌞",
    "💭 ليلة مليئة بالأحلام الجميلة.. تصبح على خير! 🌙",
    "🌟 أتمنى أن ترى أجمل الأحلام الليلة.. تصبح على خير! ⭐",
    "🌙 نام قرير العين.. غداً يوم جديد مليء بالفرص! 💪",
    "✨ تصبح على خير.. ولا تنسى أن تحلم! 💭",
    "💫 ليلة سعيدة.. أتمنى أن تنام كالأطفال! 😊",
    "🌜 القمر يضيء لك الطريق إلى أحلامك.. تصبح على خير!",
    "⭐ النجوم تراقب نومك.. تصبح على خير! 🌙",
    "💤 أحلاماً جميلة وتفاؤل عند الاستيقاظ! تصبح على خير!",
    "🌙 نام في سلام.. غداً يوم جديد مليء بالحب والسعادة! 💕",
    "✨ أغمض عينيك وتخيل أجمل ما في الحياة.. تصبح على خير!",
    "💭 الليل للراحة والنهار للنشاط.. تصبح على خير! 🌟"
];

async function goodnightCommand(sock, chatId, message) {
    try {
        // إظهار تفاعل "جاري التحميل"
        await sock.sendMessage(chatId, {
            react: { text: '🌙', key: message.key }
        });

        // إرسال رسالة "جاري التحميل"
        const loadingMsg = await sock.sendMessage(chatId, { 
            text: '🌙 *جاري البحث عن رسالة تصبح على خير...*\n⏳ يرجى الانتظار'
        }, { quoted: message });

        let goodnightMessage = null;
        
        try {
            const shizokeys = 'shizo';
            const res = await fetch(`https://shizoapi.onrender.com/api/texts/lovenight?apikey=${shizokeys}`);
            
            if (res.ok) {
                const json = await res.json();
                if (json && json.result) {
                    goodnightMessage = json.result;
                }
            }
        } catch (apiError) {
            console.log('API error, using backup messages:', apiError.message);
        }

        // حذف رسالة "جاري التحميل"
        await sock.sendMessage(chatId, { delete: loadingMsg.key });

        // استخدام رسالة احتياطية إذا فشل API
        if (!goodnightMessage) {
            goodnightMessage = backupGoodnightMessages[Math.floor(Math.random() * backupGoodnightMessages.length)];
        }

        // تنسيق الرسالة
        let userMention = '';
        let userName = '';
        
        // التحقق من وجود رد أو منشن
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        
        if (mentionedJid.length > 0) {
            userName = mentionedJid[0].split('@')[0];
            userMention = `@${userName}`;
        } else if (quotedMessage) {
            const participant = message.message.extendedTextMessage.contextInfo.participant;
            if (participant) {
                userName = participant.split('@')[0];
                userMention = `@${userName}`;
            }
        }
        
        let formattedMessage;
        if (userMention) {
            formattedMessage = `╭━━━≪•🌙 *تـبـعـلـى خـيـر* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃✨ لي: ${userMention}
┃━━━━━━━━━━━━━━━━━━━━━
┃💫 ${goodnightMessage}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
        } else {
            formattedMessage = `╭━━━≪•🌙 *تـبـعـلـى خـيـر* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃💫 ${goodnightMessage}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
        }

        // إرسال رسالة تصبح على خير
        await sock.sendMessage(chatId, { 
            text: formattedMessage,
            mentions: userName ? [mentionedJid[0] || participant] : []
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '💤', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر تصبح على خير:', error);
        
        // استخدام رسالة احتياطية في حالة الخطأ
        const fallbackMessage = backupGoodnightMessages[Math.floor(Math.random() * backupGoodnightMessages.length)];
        
        await sock.sendMessage(chatId, { 
            text: `╭━━━≪•🌙 *تـبـعـلـى خـيـر* •≫━━━╮\n┃━━━━━━━━━━━━━━━━━━━━━\n┃💫 ${fallbackMessage}\n┃━━━━━━━━━━━━━━━━━━━━━\n╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`
        }, { quoted: message });
    }
}

module.exports = { goodnightCommand };