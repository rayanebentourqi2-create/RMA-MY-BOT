const fetch = require('node-fetch');

// أشعار احتياطية بالعربية إذا فشل API
const backupShayari = [
    "💖 *شعر:*\n\nأحبك حباً لو سألوا عن مداه\nلقالوا هو البحر الذي ليس يدرى\nفقلت لهم والبحر فوق لجته\nلقد زاد حباً في فؤادي تصورا",
    "🌹 *شعر:*\n\nيا من هواه أعزه وأذلني\nكم في الهوى أسهرتني وأطلت سهدي\nيا من جفاه القلب قبل لقائه\nأبكي على عيني التي لم ترض بعد",
    "✨ *شعر:*\n\nوما الدهر إلا ساعة فاغتنمها\nفليس لها في العمر غير اغتنامها\nوما العمر إلا نسمة فاستمتع بها\nفليس لها في الدهر غير استجمامها",
    "💕 *شعر:*\n\nإذا رزقت وداداً من صديق فلا تظلمه\nوإن رزقت حبيباً فلا تخونه\nوإن رزقت يوماً بقلب فأكرمه\nفالقلوب أمانة لا تعوض بالسنة",
    "🌟 *شعر:*\n\nلا تحسبن المجد تمراً تأكله\nلن تبلغ المجد حتى تلعق الصبرا\nإن التعب يزول والمراد يبقى\nفاختر لنفسك ما يبني لك ذكرى"
];

async function shayariCommand(sock, chatId, message) {
    try {
        // إظهار تفاعل "جاري البحث"
        await sock.sendMessage(chatId, {
            react: { text: '📝', key: message.key }
        });

        // إرسال رسالة "جاري التحميل"
        const loadingMsg = await sock.sendMessage(chatId, { 
            text: '📝 *جاري البحث عن شعر...*\n⏳ يرجى الانتظار'
        }, { quoted: message });

        let shayariText = null;
        
        try {
            const response = await fetch('https://shizoapi.onrender.com/api/texts/shayari?apikey=shizo', {
                timeout: 10000
            });
            const data = await response.json();
            
            if (data && data.result) {
                shayariText = data.result;
            }
        } catch (apiError) {
            console.log('خطأ في API، استخدام أشعار احتياطية:', apiError.message);
        }

        // حذف رسالة "جاري التحميل"
        await sock.sendMessage(chatId, { delete: loadingMsg.key });

        // استخدام شعر احتياطي إذا فشل API
        if (!shayariText) {
            shayariText = backupShayari[Math.floor(Math.random() * backupShayari.length)];
        }

        // تنسيق الشعر
        const formattedMessage = `╭━━━≪•📝 *شـعـر وأشـعـار* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃✨ ${shayariText}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        const buttons = [
            { buttonId: '.شعر', buttonText: { displayText: '📝 شعر آخر' }, type: 1 },
            { buttonId: '.يوم الورد', buttonText: { displayText: '🌹 يوم الورد' }, type: 1 }
        ];

        await sock.sendMessage(chatId, { 
            text: formattedMessage,
            buttons: buttons,
            headerType: 1
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر الشعر:', error);
        
        // استخدام شعر احتياطي في حالة الخطأ
        const fallbackShayari = backupShayari[Math.floor(Math.random() * backupShayari.length)];
        
        const errorMessage = `╭━━━≪•📝 *شـعـر وأشـعـار* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃✨ ${fallbackShayari}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
    }
}

module.exports = { shayariCommand };