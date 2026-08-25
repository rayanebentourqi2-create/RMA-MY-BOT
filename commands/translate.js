const fetch = require('node-fetch');

// قائمة رموز اللغات المدعومة
const languageCodes = {
    'ar': 'العربية',
    'en': 'الإنجليزية',
    'fr': 'الفرنسية',
    'es': 'الإسبانية',
    'de': 'الألمانية',
    'it': 'الإيطالية',
    'pt': 'البرتغالية',
    'ru': 'الروسية',
    'ja': 'اليابانية',
    'ko': 'الكورية',
    'zh': 'الصينية',
    'hi': 'الهندية',
    'tr': 'التركية',
    'nl': 'الهولندية',
    'pl': 'البولندية',
    'sv': 'السويدية',
    'da': 'الدانماركية',
    'no': 'النرويجية',
    'fi': 'الفنلندية',
    'el': 'اليونانية'
};

async function handleTranslateCommand(sock, chatId, message, match) {
    try {
        // إظهار مؤشر الكتابة
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('composing', chatId);

        let textToTranslate = '';
        let lang = '';
        let detectedSourceLang = 'auto';

        // التحقق من وجود رد على رسالة
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quotedMessage) {
            // الحصول على النص من الرسالة المقتبسة
            textToTranslate = quotedMessage.conversation || 
                            quotedMessage.extendedTextMessage?.text || 
                            quotedMessage.imageMessage?.caption || 
                            quotedMessage.videoMessage?.caption || 
                            '';

            // الحصول على اللغة من الأمر
            lang = match.trim().toLowerCase();
        } else {
            // تحليل معاملات الأمر للرسالة المباشرة
            const args = match.trim().split(' ');
            if (args.length < 2) {
                const langList = Object.entries(languageCodes).map(([code, name]) => `• ${code} - ${name}`).join('\n');
                return sock.sendMessage(chatId, {
                    text: `🌐 *أمر الترجمة - JAWAD.BOT*\n\n📌 *الاستخدام:*\n1️⃣ قم بالرد على رسالة وأضف: .ترجمة <لغة>\n2️⃣ أو اكتب: .ترجمة <النص> <لغة>\n\n📝 *أمثلة:*\n• رد على رسالة: .ترجمة en\n• .ترجمة مرحباً بالعالم fr\n• .ترجمة Hello ar\n\n🌍 *رموز اللغات المدعومة:*\n${langList}\n\n✨ *سيتم ترجمة النص تلقائياً إلى اللغة المحددة*`,
                    quoted: message
                });
            }

            lang = args.pop().toLowerCase(); // الحصول على رمز اللغة
            textToTranslate = args.join(' '); // الحصول على النص للترجمة
        }

        if (!textToTranslate) {
            return sock.sendMessage(chatId, {
                text: '❌ *لا يوجد نص للترجمة!*\n\n📌 الرجاء توفير نص أو الرد على رسالة تحتوي على نص.',
                quoted: message
            });
        }

        if (!languageCodes[lang]) {
            return sock.sendMessage(chatId, {
                text: `❌ *لغة غير مدعومة!*\n\n📌 الرموز المدعومة:\n${Object.keys(languageCodes).join(', ')}\n\n📝 مثال: .ترجمة en, .ترجمة fr, .ترجمة ar`,
                quoted: message
            });
        }

        // إظهار تفاعل "جاري الترجمة"
        await sock.sendMessage(chatId, {
            react: { text: '🌐', key: message.key }
        });

        // إرسال رسالة "جاري الترجمة"
        const processingMsg = await sock.sendMessage(chatId, { 
            text: '🌐 *جاري الترجمة...*\n⏳ يرجى الانتظار'
        }, { quoted: message });

        let translatedText = null;

        // محاولة الترجمة من Google Translate API
        try {
            const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(textToTranslate)}`);
            if (response.ok) {
                const data = await response.json();
                if (data && data[0] && data[0][0] && data[0][0][0]) {
                    translatedText = data[0][0][0];
                    detectedSourceLang = data[2] || 'auto';
                }
            }
        } catch (e) {
            console.log('Google Translate API فشل:', e.message);
        }

        // إذا فشل Google، جرب MyMemory API
        if (!translatedText) {
            try {
                const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=auto|${lang}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.responseData && data.responseData.translatedText) {
                        translatedText = data.responseData.translatedText;
                        // إزالة علامات الترجمة الآلية إذا وجدت
                        translatedText = translatedText.replace(/\[auto\s*->\s*\w+\]/g, '').trim();
                    }
                }
            } catch (e) {
                console.log('MyMemory API فشل:', e.message);
            }
        }

        // إذا فشل كلاهما، جرب API آخر
        if (!translatedText) {
            try {
                const response = await fetch(`https://api.dreaded.site/api/translate?text=${encodeURIComponent(textToTranslate)}&lang=${lang}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.translated) {
                        translatedText = data.translated;
                    }
                }
            } catch (e) {
                console.log('Dreaded API فشل:', e.message);
            }
        }

        // حذف رسالة "جاري الترجمة"
        await sock.sendMessage(chatId, { delete: processingMsg.key });

        if (!translatedText) {
            throw new Error('جميع واجهات الترجمة فشلت');
        }

        // تحديد اسم اللغة المصدر والهدف
        const sourceLangName = languageCodes[detectedSourceLang] || detectedSourceLang || 'auto';
        const targetLangName = languageCodes[lang] || lang;

        // تنسيق النتيجة
        const resultMessage = `╭━━━≪•🌐 *نـتـيـجـة الـتـرجـمـة* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃📝 *النص الأصلي:*
┃${textToTranslate.substring(0, 150)}${textToTranslate.length > 150 ? '...' : ''}
┃━━━━━━━━━━━━━━━━━━━━━
┃🌍 *من:* ${sourceLangName}
┃🎯 *إلى:* ${targetLangName}
┃━━━━━━━━━━━━━━━━━━━━━
┃✨ *الترجمة:*
┃${translatedText}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        await sock.sendMessage(chatId, {
            text: resultMessage,
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('❌ خطأ في أمر الترجمة:', error);
        
        let errorMessage = '❌ *حدث خطأ!*\n⚠️ تعذرت الترجمة. يرجى المحاولة لاحقاً.\n\n📌 *الاستخدام الصحيح:*\n• رد على رسالة: .ترجمة en\n• .ترجمة النص اللغة\n\n🌐 أمثلة: .ترجمة Hello ar';
        
        await sock.sendMessage(chatId, {
            text: errorMessage,
            quoted: message
        });
    }
}

module.exports = {
    handleTranslateCommand
};