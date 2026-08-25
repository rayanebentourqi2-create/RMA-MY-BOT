const fetch = require('node-fetch');

// اقتباسات احتياطية بالعربية إذا فشل API
const backupQuotes = [
    "💭 *الحكمة:* لا تؤجل عمل اليوم إلى الغد.",
    "💭 *الحكمة:* الصديق وقت الضيق.",
    "💭 *الحكمة:* من جد وجد، ومن زرع حصد.",
    "💭 *الحكمة:* العقل السليم في الجسم السليم.",
    "💭 *الحكمة:* التجارب خير برهان.",
    "💭 *الحكمة:* اليد العليا خير من اليد السفلى.",
    "💭 *الحكمة:* خير الكلام ما قل ودل.",
    "💭 *الحكمة:* إن مع العسر يسراً.",
    "💭 *الحكمة:* القناعة كنز لا يفنى.",
    "💭 *الحكمة:* من طلب العلا سهر الليالي.",
    "💡 *اقتباس:* الحياة ليست مشكلة يجب حلها، بل واقع يجب اختباره. - كيركجارد",
    "💡 *اقتباس:* كن التغيير الذي تريد رؤيته في العالم. - غاندي",
    "💡 *اقتباس:* ما لا يقتلك يجعلك أقوى. - نيتشه",
    "💡 *اقتباس:* المستقبل لمن يؤمن بجمال أحلامه. - إيلينور روزفلت"
];

module.exports = async function quoteCommand(sock, chatId, message) {
    try {
        // إظهار تفاعل "جاري البحث"
        await sock.sendMessage(chatId, {
            react: { text: '💭', key: message.key }
        });

        // إرسال رسالة "جاري التحميل"
        const loadingMsg = await sock.sendMessage(chatId, { 
            text: '💭 *جاري البحث عن اقتباس جديد...*\n⏳ يرجى الانتظار'
        }, { quoted: message });

        let quoteMessage = null;
        
        try {
            const shizokeys = 'shizo';
            const res = await fetch(`https://shizoapi.onrender.com/api/texts/quotes?apikey=${shizokeys}`, {
                timeout: 10000
            });
            
            if (res.ok) {
                const json = await res.json();
                if (json && json.result) {
                    quoteMessage = json.result;
                }
            }
        } catch (apiError) {
            console.log('API error, using backup quotes:', apiError.message);
        }

        // حذف رسالة "جاري التحميل"
        await sock.sendMessage(chatId, { delete: loadingMsg.key });

        // استخدام اقتباس احتياطي إذا فشل API
        if (!quoteMessage) {
            quoteMessage = backupQuotes[Math.floor(Math.random() * backupQuotes.length)];
        }

        // تنسيق الاقتباس
        const formattedMessage = `╭━━━≪•💭 *اقـتـبـاس وحـكـمـة* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃✨ ${quoteMessage}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        await sock.sendMessage(chatId, { 
            text: formattedMessage
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر الاقتباس:', error);
        
        // استخدام اقتباس احتياطي في حالة الخطأ
        const fallbackQuote = backupQuotes[Math.floor(Math.random() * backupQuotes.length)];
        
        await sock.sendMessage(chatId, { 
            text: `╭━━━≪•💭 *اقـتـبـاس وحـكـمـة* •≫━━━╮\n┃━━━━━━━━━━━━━━━━━━━━━\n┃✨ ${fallbackQuote}\n┃━━━━━━━━━━━━━━━━━━━━━\n╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`
        }, { quoted: message });
    }
};