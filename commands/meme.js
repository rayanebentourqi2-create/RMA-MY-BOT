const fetch = require('node-fetch');

// قائمة مصادر متعددة للميمات
const memeApis = [
    { url: 'https://shizoapi.onrender.com/api/memes/cheems?apikey=shizo', type: 'cheems' },
    { url: 'https://shizoapi.onrender.com/api/memes/doggo?apikey=shizo', type: 'doggo' },
    { url: 'https://api.popcat.xyz/meme', type: 'popcat' }
];

async function memeCommand(sock, chatId, message) {
    try {
        // إظهار تفاعل "جاري البحث"
        await sock.sendMessage(chatId, {
            react: { text: '🐶', key: message.key }
        });

        // إرسال رسالة "جاري التحميل"
        const loadingMsg = await sock.sendMessage(chatId, { 
            text: '🐶 *جاري البحث عن ميم جديد...*\n⏳ يرجى الانتظار'
        }, { quoted: message });

        let memeBuffer = null;
        let usedApi = null;

        // محاولة جلب ميم من APIs المختلفة
        for (const api of memeApis) {
            try {
                const response = await fetch(api.url, { timeout: 15000 });
                const contentType = response.headers.get('content-type');
                
                if (contentType && contentType.includes('image')) {
                    memeBuffer = await response.buffer();
                    usedApi = api.type;
                    break;
                } else if (api.type === 'popcat') {
                    // Popcat API يعيد JSON مع رابط الصورة
                    const data = await response.json();
                    if (data && data.image) {
                        const imgResponse = await fetch(data.image);
                        memeBuffer = await imgResponse.buffer();
                        usedApi = api.type;
                        break;
                    }
                }
            } catch (e) {
                console.log(`فشل API ${api.type}:`, e.message);
            }
        }

        // حذف رسالة "جاري التحميل"
        await sock.sendMessage(chatId, { delete: loadingMsg.key });

        if (!memeBuffer) {
            throw new Error('فشلت جميع محاولات جلب الميم');
        }

        // نكات قصيرة لتكون كأزرار بديلة
        const jokes = [
            '😄 نكتة', '😂 ضحك', '🤣 موت', '😆 ههه',
            '🎭 أخرى', '🐶 كلب', '😺 قطة', '🦊 ثعلب'
        ];
        const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];

        const buttons = [
            { buttonId: '.ميم', buttonText: { displayText: '🎭 ميم آخر' }, type: 1 },
            { buttonId: '.نكتة', buttonText: { displayText: randomJoke }, type: 1 }
        ];

        const captions = {
            cheems: "🐕 *ها هو ميم تشيمس الخاص بك!*",
            doggo: "🐕‍🦺 *ها هو ميم دوغو الخاص بك!*",
            popcat: "🐱 *ها هو ميم بوبكات الخاص بك!*"
        };

        const caption = captions[usedApi] || "🎭 *ها هو الميم الخاص بك!*\n━━━━━━━━━━━━━━━━━━━━━\n> 🤖 *JAWAD.BOT*";

        await sock.sendMessage(chatId, { 
            image: memeBuffer,
            caption: caption,
            buttons: buttons,
            headerType: 1
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر الميم:', error);
        
        let errorMessage = '❌ *فشل جلب الميم!*\n⚠️ يرجى المحاولة لاحقاً.';
        
        if (error.message && error.message.includes('timeout')) {
            errorMessage = '⏰ *انتهى الوقت!*\n⚠️ الخادم بطيء حالياً. حاول مرة أخرى بعد قليل.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
    }
}

module.exports = memeCommand;