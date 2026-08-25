const axios = require('axios');

// مفتاح API للطقس (يمكنك استبداله بمفتاحك الخاص)
// للتسجيل والحصول على مفتاح مجاني: https://openweathermap.org/api
const API_KEY = '4902c0f2550f58298ad4146a92b65e10';

module.exports = async function (sock, chatId, message, city) {
    try {
        if (!city) {
            await sock.sendMessage(chatId, { 
                text: '🌤️ *أمر الطقس - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.طقس <اسم المدينة>`\n\n📝 *مثال:*\n`.طقس الدار البيضاء`\n`.طقس مكة`\n`.طقس دبي`',
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363427092431731@newsletter',
                        newsletterName: 'JAWAD.BOT',
                        serverMessageId: -1
                    }
                }
            }, { quoted: message });
            return;
        }

        // إظهار تفاعل "جاري البحث"
        await sock.sendMessage(chatId, {
            react: { text: '🌤️', key: message.key }
        });

        const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=ar`);
        const weather = response.data;
        
        // تحويل حالة الطقس إلى العربية
        const weatherDesc = weather.weather[0].description;
        const windSpeed = weather.wind.speed;
        const humidity = weather.main.humidity;
        const feelsLike = weather.main.feels_like;
        const temp = weather.main.temp;
        const tempMin = weather.main.temp_min;
        const tempMax = weather.main.temp_max;
        
        // أيقونة حسب حالة الطقس
        let weatherIcon = '🌡️';
        const mainWeather = weather.weather[0].main.toLowerCase();
        if (mainWeather.includes('clear')) weatherIcon = '☀️';
        else if (mainWeather.includes('cloud')) weatherIcon = '☁️';
        else if (mainWeather.includes('rain')) weatherIcon = '🌧️';
        else if (mainWeather.includes('thunder')) weatherIcon = '⛈️';
        else if (mainWeather.includes('snow')) weatherIcon = '❄️';
        else if (mainWeather.includes('mist') || mainWeather.includes('fog')) weatherIcon = '🌫️';
        
        const weatherText = `╭━━━≪•🌍 *الطقس* •≫━━━╮
┃━━━━━━━━━━━━━━━━━
┃📍 *المدينة:* ${weather.name}, ${weather.sys.country}
┃${weatherIcon} *الحالة:* ${weatherDesc}
┃🌡️ *درجة الحرارة:* ${temp}°C
┃🤒 *يشعر كأنه:* ${feelsLike}°C
┃📉 *الحد الأدنى:* ${tempMin}°C
┃📈 *الحد الأقصى:* ${tempMax}°C
┃💧 *الرطوبة:* ${humidity}%
┃💨 *الرياح:* ${windSpeed} م/ث
┃━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        await sock.sendMessage(chatId, { 
            text: weatherText,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363427092431731@newsletter',
                    newsletterName: 'JAWAD.BOT',
                    serverMessageId: -1
                }
            }
        }, { quoted: message });
        
    } catch (error) {
        console.error('خطأ في جلب الطقس:', error);
        
        let errorMessage = '❌ *عذراً!* لم أتمكن من جلب معلومات الطقس.';
        
        if (error.response && error.response.status === 404) {
            errorMessage = `❌ *المدينة غير موجودة!*\n\n📌 لم أتمكن من العثور على مدينة باسم "${city}".\n\n✓ تأكد من كتابة اسم المدينة بشكل صحيح\n✓ جرب كتابة المدينة باللغة الإنجليزية\n\n📝 مثال: .طقس Casablanca`;
        } else if (error.response && error.response.status === 401) {
            errorMessage = '❌ *خطأ في مفتاح API!*\n\nيرجى التواصل مع المطور لحل المشكلة.';
        } else {
            errorMessage = `❌ *حدث خطأ!*\n\nتعذر جلب معلومات الطقس للمدينة: ${city}\n\n✓ تأكد من اتصالك بالإنترنت\n✓ حاول مرة أخرى لاحقاً`;
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363427092431731@newsletter',
                    newsletterName: 'JAWAD.BOT',
                    serverMessageId: -1
                }
            }
        }, { quoted: message });
    }
};