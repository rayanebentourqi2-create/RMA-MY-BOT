const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');

// دالة الحصول على كود اللغة من اسم اللغة العربية
function getLanguageCode(langName) {
    const languages = {
        'ar': 'ar', 'arabic': 'ar', 'عربي': 'ar', 'العربية': 'ar',
        'en': 'en', 'english': 'en', 'انجليزي': 'en', 'الإنجليزية': 'en',
        'fr': 'fr', 'french': 'fr', 'فرنسي': 'fr', 'الفرنسية': 'fr',
        'es': 'es', 'spanish': 'es', 'اسباني': 'es', 'الإسبانية': 'es',
        'de': 'de', 'german': 'de', 'الماني': 'de', 'الألمانية': 'de',
        'it': 'it', 'italian': 'it', 'ايطالي': 'it', 'الإيطالية': 'it',
        'pt': 'pt', 'portuguese': 'pt', 'برتغالي': 'pt', 'البرتغالية': 'pt',
        'ru': 'ru', 'russian': 'ru', 'روسي': 'ru', 'الروسية': 'ru',
        'ja': 'ja', 'japanese': 'ja', 'ياباني': 'ja', 'اليابانية': 'ja',
        'ko': 'ko', 'korean': 'ko', 'كوري': 'ko', 'الكورية': 'ko',
        'zh': 'zh', 'chinese': 'zh', 'صيني': 'zh', 'الصينية': 'zh',
        'hi': 'hi', 'hindi': 'hi', 'هندي': 'hi', 'الهندية': 'hi'
    };
    return languages[langName.toLowerCase()] || 'ar';
}

async function ttsCommand(sock, chatId, text, message, language = 'ar') {
    try {
        // التحقق من وجود النص
        if (!text) {
            await sock.sendMessage(chatId, { 
                text: '🔊 *أمر تحويل النص إلى كلام - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.كلام <النص>`\n`.كلام <اللغة> <النص>`\n\n📝 *أمثلة:*\n`.كلام السلام عليكم`\n`.كلام en Hello World`\n`.كلام fr Bonjour`\n\n🌐 *اللغات المدعومة:*\nالعربية (ar)، الإنجليزية (en)، الفرنسية (fr)، الإسبانية (es)، الألمانية (de)، الإيطالية (it)، البرتغالية (pt)، الروسية (ru)، اليابانية (ja)، الكورية (ko)، الصينية (zh)، الهندية (hi)'
            }, { quoted: message });
            return;
        }

        // إظهار تفاعل "جاري التحويل"
        await sock.sendMessage(chatId, {
            react: { text: '🔊', key: message.key }
        });

        // تحويل كود اللغة إذا كان مكتوباً بالعربية
        let langCode = language;
        const langMap = {
            'عربي': 'ar', 'العربية': 'ar', 'انجليزي': 'en', 'الإنجليزية': 'en',
            'فرنسي': 'fr', 'الفرنسية': 'fr', 'اسباني': 'es', 'الإسبانية': 'es',
            'الماني': 'de', 'الألمانية': 'de', 'ايطالي': 'it', 'الإيطالية': 'it'
        };
        
        if (langMap[language.toLowerCase()]) {
            langCode = langMap[language.toLowerCase()];
        }

        // إنشاء مجلد الأصول إذا لم يكن موجوداً
        const assetsDir = path.join(__dirname, '..', 'assets');
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }

        const fileName = `tts-${Date.now()}.mp3`;
        const filePath = path.join(assetsDir, fileName);

        // إرسال رسالة "جاري التجهيز"
        const processingMsg = await sock.sendMessage(chatId, { 
            text: '🔊 *جاري تحويل النص إلى كلام...*\n⏳ يرجى الانتظار'
        }, { quoted: message });

        // إنشاء ملف الصوت
        const gtts = new gTTS(text, langCode);
        
        gtts.save(filePath, async function (err) {
            // حذف رسالة "جاري التجهيز"
            await sock.sendMessage(chatId, { delete: processingMsg.key });
            
            if (err) {
                console.error('خطأ في إنشاء ملف TTS:', err);
                await sock.sendMessage(chatId, { 
                    text: '❌ *حدث خطأ!*\n⚠️ تعذر إنشاء ملف الصوت. يرجى المحاولة لاحقاً.'
                }, { quoted: message });
                return;
            }

            // إرسال الملف الصوتي
            await sock.sendMessage(chatId, {
                audio: { url: filePath },
                mimetype: 'audio/mpeg',
                ptt: false,
                fileName: `tts_${Date.now()}.mp3`
            }, { quoted: message });

            // إظهار تفاعل النجاح
            await sock.sendMessage(chatId, {
                react: { text: '✅', key: message.key }
            });

            // حذف الملف المؤقت
            try {
                fs.unlinkSync(filePath);
            } catch(e) {
                console.error('خطأ في حذف الملف المؤقت:', e);
            }
        });
        
    } catch (error) {
        console.error('خطأ في أمر TTS:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ *حدث خطأ!*\n⚠️ تعذر تحويل النص إلى كلام. يرجى المحاولة لاحقاً.'
        }, { quoted: message });
    }
}

module.exports = ttsCommand;