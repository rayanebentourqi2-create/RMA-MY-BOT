const fetch = require('node-fetch');

// رسائل يوم الورد احتياطية بالعربية إذا فشل API
const backupRosedayMessages = [
    "🌹 *يوم الورد المبارك!* 🌹\n\nكل عام وأنت بخير، أتمنى أن يكون يومك مليئاً بالورد والسعادة! 💕",
    "🌸 *كل عام وأنت حبيبتي/حبيبي* 🌸\n\nفي يوم الورد، أرسل لك وردة حب تدوم للأبد. 💖",
    "🌺 *عيد حب سعيد!* 🌺\n\nالورود تتفتح اليوم لتحكي قصة حبنا الجميلة. 💗",
    "🌷 *كل عام وأنت أجمل وردة في حياتي* 🌷\n\nأتمنى أن تحمل هذه الوردة كل معاني الحب والإخلاص. 💝",
    "💐 *يوم ورد سعيد* 💐\n\nلحبك في قلبي ورد لا يذبل أبداً. 💕",
    "🌹 *أنت وردة حياتي* 🌹\n\nفي يوم الورد، أهديك قلبي كله. ❤️",
    "🌸 *كل عام وأنت نور عيني* 🌸\n\nوجودك في حياتي أجمل من ألف وردة. 💖",
    "🌺 *حبك في قلبي كالورد في الربيع* 🌺\n\nكل عام وأنت حبي. 💗",
    "🌷 *أتمنى لك يوماً مليئاً بالورود والسعادة* 🌷\n\nأنت سبب فرحتي في كل يوم. 💕"
];

async function rosedayCommand(sock, chatId, message) {
    try {
        // إظهار تفاعل "جاري البحث"
        await sock.sendMessage(chatId, {
            react: { text: '🌹', key: message.key }
        });

        // إرسال رسالة "جاري التحميل"
        const loadingMsg = await sock.sendMessage(chatId, { 
            text: '🌹 *جاري البحث عن رسالة يوم الورد...*\n⏳ يرجى الانتظار'
        }, { quoted: message });

        let rosedayMessage = null;
        
        try {
            const res = await fetch(`https://api.princetechn.com/api/fun/roseday?apikey=prince`, {
                timeout: 10000
            });
            
            if (res.ok) {
                const json = await res.json();
                if (json && json.result) {
                    rosedayMessage = json.result;
                }
            }
        } catch (apiError) {
            console.log('خطأ في API، استخدام رسائل احتياطية:', apiError.message);
        }

        // حذف رسالة "جاري التحميل"
        await sock.sendMessage(chatId, { delete: loadingMsg.key });

        // استخدام رسالة احتياطية إذا فشل API
        if (!rosedayMessage) {
            rosedayMessage = backupRosedayMessages[Math.floor(Math.random() * backupRosedayMessages.length)];
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
            formattedMessage = `╭━━━≪•🌹 *يـوم الـورد* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃✨ لـ: ${userMention}
┃━━━━━━━━━━━━━━━━━━━━━
┃💐 ${rosedayMessage}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
        } else {
            formattedMessage = `╭━━━≪•🌹 *يـوم الـورد* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃💐 ${rosedayMessage}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
        }

        await sock.sendMessage(chatId, { 
            text: formattedMessage,
            mentions: userName ? [mentionedJid[0] || participant] : []
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر يوم الورد:', error);
        
        // استخدام رسالة احتياطية في حالة الخطأ
        const fallbackMessage = backupRosedayMessages[Math.floor(Math.random() * backupRosedayMessages.length)];
        
        await sock.sendMessage(chatId, { 
            text: `╭━━━≪•🌹 *يـوم الـورد* •≫━━━╮\n┃━━━━━━━━━━━━━━━━━━━━━\n┃💐 ${fallbackMessage}\n┃━━━━━━━━━━━━━━━━━━━━━\n╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`
        }, { quoted: message });
    }
}

module.exports = { rosedayCommand };