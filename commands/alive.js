const settings = require("../settings");

async function aliveCommand(sock, chatId, message) {
    try {
        const now = new Date();
        const timeString = now.toLocaleString('ar-EG', {
            hour12: true,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        const message1 = `*🤖 JAWAD.BOT يعمل الآن!*\n\n` +
                       `*📌 الإصدار:* ${settings.version || '2.0.0'}\n` +
                       `*✅ الحالة:* متصل وجاهز\n` +
                       `*🌐 الوضع:* عام\n` +
                       `*🕒 الوقت الحالي:* ${timeString}\n\n` +
                       `*🌟 المميزات:*\n` +
                       `• إدارة المجموعات 👥\n` +
                       `• حماية الروابط 🔗\n` +
                       `• أوامر ترفيهية 🎭\n` +
                       `• تحميل فيديوهات وأغاني 🎵\n` +
                       `• ذكاء اصطناعي 🤖\n` +
                       `• والمزيد!\n\n` +
                       `📝 *لرؤية جميع الأوامر:*\n` +
                       `اكتب *.اوامر* أو *.menu*\n\n` +
                       `━━━━━━━━━━━━━━━━━━━━━\n` +
                       `📢 *قناة البوت:* ${global.channelLink || 'https://whatsapp.com/channel/0029Vb7kJt29Gv7W5J0McQ09'}\n` +
                       `👨‍💻 *المطور:* ${global.developer || 'DarkXecutor'}`;

        await sock.sendMessage(chatId, {
            text: message1,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: global.channelId || '120363427092431731@newsletter',
                    newsletterName: 'JAWAD.BOT',
                    serverMessageId: -1
                }
            }
        }, { quoted: message });
    } catch (error) {
        console.error('خطأ في أمر التحقق من البوت:', error);
        await sock.sendMessage(chatId, { text: '🤖 JAWAD.BOT يعمل الآن وبخدمتك!' }, { quoted: message });
    }
}

module.exports = aliveCommand;