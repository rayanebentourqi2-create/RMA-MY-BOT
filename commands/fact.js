const axios = require('axios');

// قائمة APIs للحقائق بالعربية والإنجليزية
const factAPIs = [
    { url: 'https://uselessfacts.jsph.pl/random.json?language=en', type: 'english', field: 'text' },
    { url: 'https://api.popcat.xyz/fact', type: 'english', field: 'fact' },
    { url: 'https://catfact.ninja/fact', type: 'english', field: 'fact' }
];

module.exports = async function (sock, chatId, message) {
    try {
        // إظهار تفاعل "جاري البحث"
        await sock.sendMessage(chatId, {
            react: { text: '💡', key: message.key }
        });

        // إرسال رسالة "جاري التحميل"
        const loadingMsg = await sock.sendMessage(chatId, { 
            text: '💡 *جاري البحث عن حقيقة جديدة...*\n⏳ يرجى الانتظار'
        }, { quoted: message });

        let fact = null;
        let usedAPI = null;

        // محاولة الحصول على حقيقة من APIs المختلفة
        for (const api of factAPIs) {
            try {
                const response = await axios.get(api.url, { timeout: 10000 });
                if (response.data && response.data[api.field]) {
                    fact = response.data[api.field];
                    usedAPI = api.url;
                    break;
                }
            } catch (err) {
                console.log(`فشل API ${api.url}:`, err.message);
                continue;
            }
        }

        // حذف رسالة "جاري التحميل"
        await sock.sendMessage(chatId, { delete: loadingMsg.key });

        if (!fact) {
            // حقائق احتياطية إذا فشلت جميع APIs
            const backupFacts = [
                "🐝 النحل يمكنه التعرف على الوجوه البشرية!",
                "🌊 المحيط يحتوي على 99% من مساحة المعيشة على الأرض.",
                "🦒 قلب الزرافة يزن حوالي 11 كيلوغراماً!",
                "🍿 الفشار موجود منذ أكثر من 5000 سنة.",
                "🐧 طيور البطريق تعطس لإخراج الملح الزائد من الماء.",
                "🌙 القمر يبتعد عن الأرض بحوالي 3.8 سم كل عام.",
                "🐙 الأخطبوط لديه ثلاثة قلوب.",
                "🍫 الشوكولاتة الداكنة مفيدة للقلب.",
                "🦷 الحلزون لديه حوالي 25,000 سن.",
                "🐪 سنام الجمل يخزن الدهون وليس الماء."
            ];
            fact = backupFacts[Math.floor(Math.random() * backupFacts.length)];
        }

        // ترجمة بعض الحقائق الإنجليزية إلى عربية (اختياري)
        const translations = {
            'Honey never spoils.': '🍯 العسل لا يفسد أبداً!',
            'A day on Venus is longer than a year on Venus.': '🪐 يوم على كوكب الزهرة أطول من سنة على كوكب الزهرة!',
            'Octopuses have three hearts.': '🐙 الأخطبوط لديه ثلاثة قلوب!',
            'Bananas are berries, but strawberries are not.': '🍌 الموز من التوت، لكن الفراولة ليست كذلك!',
            'A group of flamingos is called a "flamboyance."': '🦩 مجموعة طيور الفلامنجو تسمى "بذخ"!'
        };
        
        let finalFact = fact;
        if (translations[fact]) {
            finalFact = translations[fact];
        }

        const formattedMessage = `╭━━━≪•💡 *حـقـيـقـة مـنـيـرة* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃✨ ${finalFact}
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
        console.error('خطأ في جلب الحقيقة:', error);
        
        let errorMessage = '❌ *حدث خطأ!*\n⚠️ تعذر جلب حقيقة جديدة. يرجى المحاولة لاحقاً.';
        
        if (error.message && error.message.includes('timeout')) {
            errorMessage = '⏰ *انتهى الوقت!*\n⚠️ الخادم بطيء حالياً. حاول مرة أخرى بعد قليل.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
    }
};