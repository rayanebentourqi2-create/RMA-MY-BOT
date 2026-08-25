const axios = require('axios');
const settings = require('../settings');

// مفتاح API افتراضي إذا لم يكن موجوداً في الإعدادات
const DEFAULT_API_KEY = 'YOUR_GIPHY_API_KEY_HERE'; // يجب استبداله بمفتاح حقيقي

async function gifCommand(sock, chatId, query, message) {
    // الحصول على مفتاح API من الإعدادات أو استخدام الافتراضي
    const apiKey = settings.giphyApiKey || DEFAULT_API_KEY;
    
    if (!query) {
        await sock.sendMessage(chatId, { 
            text: '🎬 *أمر البحث عن GIF - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.جيف <كلمة البحث>`\n\n📝 *أمثلة:*\n`.جيف ضحك`\n`.جيف قطط`\n`.جيف حب`\n\n✨ *سيتم عرض GIF متحرك حسب طلبك*'
        }, { quoted: message });
        return;
    }

    if (apiKey === DEFAULT_API_KEY || apiKey === 'YOUR_GIPHY_API_KEY_HERE') {
        await sock.sendMessage(chatId, { 
            text: '❌ *مفتاح API غير صالح!*\n⚠️ يرجى إضافة مفتاح GIPHY API في ملف الإعدادات.\n\n📌 *للحصول على مفتاح:*\n1. سجل في https://developers.giphy.com\n2. أنشئ تطبيقاً جديداً\n3. انسخ المفتاح وأضفه إلى settings.js'
        }, { quoted: message });
        return;
    }

    try {
        // إظهار تفاعل "جاري البحث"
        await sock.sendMessage(chatId, {
            react: { text: '🎬', key: message.key }
        });

        // إرسال رسالة "جاري البحث"
        const loadingMsg = await sock.sendMessage(chatId, { 
            text: `🎬 *جاري البحث عن GIF لـ:* ${query}\n⏳ يرجى الانتظار`
        }, { quoted: message });

        const response = await axios.get(`https://api.giphy.com/v1/gifs/search`, {
            params: {
                api_key: apiKey,
                q: query,
                limit: 5,     // جلب 5 نتائج لاختيار أفضل واحد
                rating: 'g',
                lang: 'ar'
            }
        });

        // حذف رسالة "جاري البحث"
        await sock.sendMessage(chatId, { delete: loadingMsg.key });

        if (response.data.data && response.data.data.length > 0) {
            // اختيار GIF عشوائي من النتائج
            const randomIndex = Math.floor(Math.random() * Math.min(5, response.data.data.length));
            const gif = response.data.data[randomIndex];
            const gifUrl = gif.images?.downsized_medium?.url || gif.images?.original?.url;
            const title = gif.title || query;

            const caption = `╭━━━≪•🎬 *GIF - JAWAD.BOT* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🔍 *البحث:* ${query}
┃📝 *العنوان:* ${title.substring(0, 50)}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

            await sock.sendMessage(chatId, { 
                video: { url: gifUrl }, 
                caption: caption,
                gifPlayback: true
            }, { quoted: message });
            
            // إظهار تفاعل النجاح
            await sock.sendMessage(chatId, {
                react: { text: '✅', key: message.key }
            });
        } else {
            await sock.sendMessage(chatId, { 
                text: `❌ *لم يتم العثور على GIFات!*\n🔍 لم أجد نتائج لـ "${query}"\n📌 حاول بكلمات بحث مختلفة مثل: ضحك، قطط، حب، مرح`
            }, { quoted: message });
        }
    } catch (error) {
        console.error('خطأ في جلب GIF:', error);
        
        let errorMessage = '❌ *فشل جلب GIF!*\n⚠️ يرجى المحاولة لاحقاً.';
        
        if (error.response && error.response.status === 429) {
            errorMessage = '⏳ *تم الوصول للحد الأقصى!*\n⚠️ هناك عدد كبير من الطلبات. يرجى الانتظار ثم المحاولة مرة أخرى.';
        } else if (error.response && error.response.status === 403) {
            errorMessage = '🔑 *خطأ في مفتاح API!*\n⚠️ يرجى التحقق من مفتاح GIPHY API في الإعدادات.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
    }
}

module.exports = gifCommand;