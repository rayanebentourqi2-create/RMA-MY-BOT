const fetch = require('node-fetch');

const BASE = 'https://api.shizo.top/pies';
const VALID_COUNTRIES = ['india', 'malaysia', 'thailand', 'china', 'indonesia', 'japan', 'korea', 'vietnam'];

// أسماء الدول بالعربية
const countryNames = {
    'india': '🇮🇳 الهند',
    'malaysia': '🇲🇾 ماليزيا',
    'thailand': '🇹🇭 تايلاند',
    'china': '🇨🇳 الصين',
    'indonesia': '🇮🇩 إندونيسيا',
    'japan': '🇯🇵 اليابان',
    'korea': '🇰🇷 كوريا',
    'vietnam': '🇻🇳 فيتنام'
};

// تحويل الأسماء العربية إلى إنجليزية
const arabicToEnglish = {
    'الهند': 'india',
    'هند': 'india',
    'ماليزيا': 'malaysia',
    'تايلاند': 'thailand',
    'تايلند': 'thailand',
    'الصين': 'china',
    'صين': 'china',
    'اندونيسيا': 'indonesia',
    'إندونيسيا': 'indonesia',
    'اليابان': 'japan',
    'يابان': 'japan',
    'كوريا': 'korea',
    'فيتنام': 'vietnam'
};

async function fetchPiesImageBuffer(country) {
    const url = `${BASE}/${country}?apikey=shizo`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('image')) throw new Error('API لم يعد صورة');
    return res.buffer();
}

async function piesCommand(sock, chatId, message, args) {
    try {
        const sub = (args && args[0] ? args[0] : '').toLowerCase();
        
        if (!sub) {
            const countriesList = VALID_COUNTRIES.map(c => `• ${c} - ${countryNames[c]}`).join('\n');
            await sock.sendMessage(chatId, { 
                text: `🖼️ *أوامر الصور - JAWAD.BOT*\n\n📌 *الاستخدام:*\n.صور <الدولة>\n\n🌍 *الدول المتاحة:*\n${countriesList}\n\n📝 *مثال:*\n.صور الهند\n.صور اليابان\n\n✨ *سيتم عرض صور من الدولة المختارة*`
            }, { quoted: message });
            return;
        }
        
        // تحويل الاسم العربي إلى الاسم الإنجليزي
        let countryCode = sub;
        
        if (arabicToEnglish[sub]) {
            countryCode = arabicToEnglish[sub];
        }
        
        if (!VALID_COUNTRIES.includes(countryCode)) {
            const countriesList = VALID_COUNTRIES.map(c => `• ${c} - ${countryNames[c]}`).join('\n');
            await sock.sendMessage(chatId, { 
                text: `❌ *دولة غير مدعومة!*\n📌 *الدول المتاحة:*\n${countriesList}` 
            }, { quoted: message });
            return;
        }
        
        // إظهار تفاعل "جاري التحميل"
        await sock.sendMessage(chatId, {
            react: { text: '🖼️', key: message.key }
        });
        
        const imageBuffer = await fetchPiesImageBuffer(countryCode);
        const caption = `╭━━━≪•🖼️ *صـور - JAWAD.BOT* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🌍 *الدولة:* ${countryNames[countryCode]}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
        
        await sock.sendMessage(
            chatId,
            { image: imageBuffer, caption: caption },
            { quoted: message }
        );
        
        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });
        
    } catch (err) {
        console.error('خطأ في أمر الصور:', err);
        await sock.sendMessage(chatId, { 
            text: '❌ *فشل جلب الصورة!*\n⚠️ يرجى المحاولة لاحقاً.' 
        }, { quoted: message });
    }
}

async function piesAlias(sock, chatId, message, country) {
    try {
        const imageBuffer = await fetchPiesImageBuffer(country);
        const caption = `╭━━━≪•🖼️ *صـور - JAWAD.BOT* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🌍 *الدولة:* ${countryNames[country] || country}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
        
        await sock.sendMessage(
            chatId,
            { image: imageBuffer, caption: caption },
            { quoted: message }
        );
    } catch (err) {
        console.error(`خطأ في أمر الصور (${country}):`, err);
        await sock.sendMessage(chatId, { 
            text: '❌ *فشل جلب الصورة!*\n⚠️ يرجى المحاولة لاحقاً.' 
        }, { quoted: message });
    }
}

module.exports = { piesCommand, piesAlias, VALID_COUNTRIES };