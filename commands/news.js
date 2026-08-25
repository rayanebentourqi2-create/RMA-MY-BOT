const axios = require('axios');

// مفتاح API الافتراضي (يفضل استبداله بمفتاح خاص)
const DEFAULT_API_KEY = 'dcd720a6f1914e2d9dba9790c188c08c';

// أخبار احتياطية إذا فشل API
const backupNews = [
    "🚀 *أخبار:* تم إطلاق قمر صناعي جديد لدراسة تغير المناخ من وكالة الفضاء الأوروبية.",
    "🤖 *أخبار:* شركة OpenAI تعلن عن نموذج جديد للذكاء الاصطناعي قادر على فهم المشاعر البشرية.",
    "📱 *أخبار:* واتساب تطلق ميزة جديدة لتشفير النسخ الاحتياطي للمحادثات.",
    "💻 *أخبار:* مايكروسوفت تعلن عن تحديث كبير لنظام Windows 11 مع ميزات الذكاء الاصطناعي.",
    "🔒 *أخبار:* خبراء أمنيون يحذرون من ثغرة جديدة في تطبيقات المراسلة الفورية."
];

module.exports = async function (sock, chatId, message) {
    try {
        // إظهار تفاعل "جاري البحث"
        await sock.sendMessage(chatId, {
            react: { text: '📰', key: message.key }
        });

        // إرسال رسالة "جاري التحميل"
        const loadingMsg = await sock.sendMessage(chatId, { 
            text: '📰 *جاري جلب آخر الأخبار...*\n⏳ يرجى الانتظار'
        }, { quoted: message });

        let articles = null;
        let usedAPI = false;

        // محاولة جلب الأخبار من API
        try {
            const apiKey = process.env.NEWS_API_KEY || DEFAULT_API_KEY;
            // محاولة جلب أخبار عالمية بالعربية
            const response = await axios.get(`https://newsapi.org/v2/top-headlines?language=ar&apiKey=${apiKey}`, {
                timeout: 15000
            });
            if (response.data && response.data.articles && response.data.articles.length > 0) {
                articles = response.data.articles.slice(0, 5);
                usedAPI = true;
            }
        } catch (apiError) {
            console.log('فشل جلب الأخبار من NewsAPI، جاري تجربة مصدر آخر...');
            
            // محاولة مصدر آخر (GNews API)
            try {
                const gnewsResponse = await axios.get(`https://gnews.io/api/v4/top-headlines?country=eg&lang=ar&token=YOUR_TOKEN`, {
                    timeout: 15000
                });
                if (gnewsResponse.data && gnewsResponse.data.articles && gnewsResponse.data.articles.length > 0) {
                    articles = gnewsResponse.data.articles.slice(0, 5);
                    usedAPI = true;
                }
            } catch (gnewsError) {
                console.log('فشل جلب الأخبار من GNews');
            }
        }

        // حذف رسالة "جاري التحميل"
        await sock.sendMessage(chatId, { delete: loadingMsg.key });

        let newsMessage = '';
        
        if (usedAPI && articles && articles.length > 0) {
            newsMessage = `╭━━━≪•📰 *آخـر الأخـبـار* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🌍 *أهم الأحداث حول العالم*
┃━━━━━━━━━━━━━━━━━━━━━\n`;
            
            articles.forEach((article, index) => {
                const title = article.title || 'بدون عنوان';
                const description = article.description || 'لا يوجد وصف';
                const source = article.source?.name || '';
                newsMessage += `┃\n┃📌 *${index + 1}. ${title}*\n`;
                newsMessage += `┃📝 ${description.substring(0, 150)}${description.length > 150 ? '...' : ''}\n`;
                if (source) newsMessage += `┃📡 *المصدر:* ${source}\n`;
                newsMessage += `┃━━━━━━━━━━━━━━━━━━━━━\n`;
            });
            
            newsMessage += `╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
        } else {
            // استخدام الأخبار الاحتياطية
            newsMessage = `╭━━━≪•📰 *آخـر الأخـبـار* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃⚠️ *تعذر جلب الأخبار من الخادم*
┃📌 *إليك بعض الأخبار العشوائية:*
┃━━━━━━━━━━━━━━━━━━━━━\n`;
            
            backupNews.forEach((news, index) => {
                newsMessage += `┃\n┃📌 ${index + 1}. ${news}\n`;
                newsMessage += `┃━━━━━━━━━━━━━━━━━━━━━\n`;
            });
            
            newsMessage += `┃💡 *يرجى المحاولة لاحقاً للحصول على آخر الأخبار*
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
        }

        await sock.sendMessage(chatId, { 
            text: newsMessage
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في جلب الأخبار:', error);
        
        // استخدام الأخبار الاحتياطية في حالة الخطأ
        const fallbackMessage = `╭━━━≪•📰 *آخـر الأخـبـار* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃⚠️ *حدث خطأ في الاتصال بالخادم*
┃📌 *إليك بعض الأخبار:*
┃━━━━━━━━━━━━━━━━━━━━━\n${backupNews.map((news, i) => `┃\n┃📌 ${i + 1}. ${news}\n┃━━━━━━━━━━━━━━━━━━━━━`).join('')}
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
        
        await sock.sendMessage(chatId, { 
            text: fallbackMessage
        }, { quoted: message });
    }
};