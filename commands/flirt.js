const fetch = require('node-fetch');

// قائمة رسائل غزل احتياطية بالعربية
const backupFlirts = [
    "💕 هل تعلم؟ أنت سبب ابتسامتي كل صباح!",
    "💖 لو كان الجمال كلمات، لكنت أطول قصيدة في العالم!",
    "💘 هل أنت ساحر؟ لأن كل الوقت الذي أراك فيه أشعر بالسحر!",
    "💗 هل لديك خريطة؟ لقد ضللت في عينيك!",
    "💓 هل أنت كهرباء؟ لأن قلبي يتوقف عندما أراك!",
    "💝 هل أنت الشمس؟ لأنك تضيئين حياتي!",
    "💞 إذا كان الحب خطأ، فأنا لا أريد أن أكون صحيحاً!",
    "💕 هل تعلمين أن جمالك يخطف الأنفاس؟",
    "💖 أنت أجمل من القمر في ليلة اكتماله!",
    "💘 صوتك يعزف سيمفونية في قلبي!",
    "💗 لو كنت وردة لكنت أندر وردة في العالم!",
    "💓 ابتسامتك تشرق كالفجر في قلبي!",
    "💝 عيناك بحر لا أريد أن أسبح فيه وحيداً!",
    "💞 أنت كالحلم الجميل الذي لا أريد أن استيقظ منه!",
    "💕 وجودك في حياتي هو أجمل هدية!"
];

async function flirtCommand(sock, chatId, message) {
    try {
        // إظهار تفاعل "جاري البحث"
        await sock.sendMessage(chatId, {
            react: { text: '💕', key: message.key }
        });

        // إرسال رسالة "جاري التحميل"
        const loadingMsg = await sock.sendMessage(chatId, { 
            text: '💕 *جاري البحث عن رسالة غزل...*\n⏳ يرجى الانتظار'
        }, { quoted: message });

        let flirtMessage = null;
        
        try {
            const shizokeys = 'shizo';
            const res = await fetch(`https://shizoapi.onrender.com/api/texts/flirt?apikey=${shizokeys}`);
            
            if (res.ok) {
                const json = await res.json();
                if (json && json.result) {
                    flirtMessage = json.result;
                }
            }
        } catch (apiError) {
            console.log('API error, using backup flirts:', apiError.message);
        }

        // حذف رسالة "جاري التحميل"
        await sock.sendMessage(chatId, { delete: loadingMsg.key });

        // استخدام رسالة احتياطية إذا فشل API
        if (!flirtMessage) {
            flirtMessage = backupFlirts[Math.floor(Math.random() * backupFlirts.length)];
        }

        // تنسيق الرسالة
        const formattedMessage = `╭━━━≪•💕 *رسـالـة غـزل* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃✨ ${flirtMessage}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        // إرسال رسالة الغزل
        await sock.sendMessage(chatId, { 
            text: formattedMessage
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '💝', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر الغزل:', error);
        
        // استخدام رسالة احتياطية في حالة الخطأ
        const fallbackFlirt = backupFlirts[Math.floor(Math.random() * backupFlirts.length)];
        
        await sock.sendMessage(chatId, { 
            text: `╭━━━≪•💕 *رسـالـة غـزل* •≫━━━╮\n┃━━━━━━━━━━━━━━━━━━━━━\n┃✨ ${fallbackFlirt}\n┃━━━━━━━━━━━━━━━━━━━━━\n╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`
        }, { quoted: message });
    }
}

module.exports = { flirtCommand };