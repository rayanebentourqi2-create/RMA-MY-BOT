const axios = require('axios');
const mumaker = require('mumaker');

// قوالب معلومات القناة
const channelInfo = {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363427092431731@newsletter',
        newsletterName: 'JAWAD.BOT',
        serverMessageId: -1
    }
};

// قوالب الرسائل القابلة لإعادة الاستخدام
const messageTemplates = {
    error: (message) => ({
        text: message,
        contextInfo: channelInfo
    }),
    success: (text, imageUrl, effectType) => ({
        image: { url: imageUrl },
        caption: `✨ *تأثير ${effectType} - JAWAD.BOT*\n📝 *النص:* ${text}\n━━━━━━━━━━━━━━━━━━━━━\n> 🤖 *تم الإنشاء بواسطة JAWAD.BOT*`,
        contextInfo: channelInfo
    })
};

// أسماء التأثيرات بالعربية
const effectNames = {
    metallic: 'معدني',
    ice: 'ثلج',
    snow: 'ثلج متساقط',
    impressive: 'ملون',
    matrix: 'ماتريكس',
    light: 'ضوء',
    neon: 'نيون',
    devil: 'شيطان',
    purple: 'بنفسجي',
    thunder: 'رعد',
    leaves: 'أوراق',
    '1917': 'طراز 1917',
    arena: 'ساحة',
    hacker: 'هاكر',
    sand: 'رمل',
    blackpink: 'بلاك بينك',
    glitch: 'تشويش',
    fire: 'نار'
};

async function textmakerCommand(sock, chatId, message, q, type) {
    try {
        // عرض قائمة التأثيرات إذا لم يحدد المستخدم نصاً
        if (!q) {
            const effectsList = Object.entries(effectNames).map(([key, name]) => `• .${key} <نص> - ${name}`).join('\n');
            return await sock.sendMessage(chatId, messageTemplates.error(
                `🎨 *أوامر تأثيرات النصوص - JAWAD.BOT*\n\n📌 *الاستخدام:*\n.${type} <النص>\n\n📝 *مثال:*\n.${type} JAWAD\n\n✨ *التأثيرات المتاحة:*\n${effectsList}\n\n📌 *ملاحظة:* بعض التأثيرات قد تستغرق بضع ثوانٍ للتحميل.`
            ));
        }

        // استخراج النص
        const text = q.split(' ').slice(1).join(' ');

        if (!text) {
            return await sock.sendMessage(chatId, messageTemplates.error(
                `❌ *خطأ!*\n\n📌 يرجى إدخال نص بعد الأمر.\n📝 مثال: .${type} مرحباً`
            ));
        }

        // إظهار تفاعل "جاري المعالجة"
        await sock.sendMessage(chatId, {
            react: { text: '🎨', key: message.key }
        });

        // إرسال رسالة "جاري التجهيز"
        const processingMsg = await sock.sendMessage(chatId, { 
            text: `🎨 *جاري إنشاء تأثير ${effectNames[type] || type}...*\n📝 النص: ${text}\n⏳ يرجى الانتظار، قد يستغرق هذا بضع ثوانٍ.`
        }, { quoted: message });

        try {
            let result;
            switch (type) {
                case 'metallic':
                    result = await mumaker.ephoto("https://en.ephoto360.com/impressive-decorative-3d-metal-text-effect-798.html", text);
                    break;
                case 'ice':
                    result = await mumaker.ephoto("https://en.ephoto360.com/ice-text-effect-online-101.html", text);
                    break;
                case 'snow':
                    result = await mumaker.ephoto("https://en.ephoto360.com/create-a-snow-3d-text-effect-free-online-621.html", text);
                    break;
                case 'impressive':
                    result = await mumaker.ephoto("https://en.ephoto360.com/create-3d-colorful-paint-text-effect-online-801.html", text);
                    break;
                case 'matrix':
                    result = await mumaker.ephoto("https://en.ephoto360.com/matrix-text-effect-154.html", text);
                    break;
                case 'light':
                    result = await mumaker.ephoto("https://en.ephoto360.com/light-text-effect-futuristic-technology-style-648.html", text);
                    break;
                case 'neon':
                    result = await mumaker.ephoto("https://en.ephoto360.com/create-colorful-neon-light-text-effects-online-797.html", text);
                    break;
                case 'devil':
                    result = await mumaker.ephoto("https://en.ephoto360.com/neon-devil-wings-text-effect-online-683.html", text);
                    break;
                case 'purple':
                    result = await mumaker.ephoto("https://en.ephoto360.com/purple-text-effect-online-100.html", text);
                    break;
                case 'thunder':
                    result = await mumaker.ephoto("https://en.ephoto360.com/thunder-text-effect-online-97.html", text);
                    break;
                case 'leaves':
                    result = await mumaker.ephoto("https://en.ephoto360.com/green-brush-text-effect-typography-maker-online-153.html", text);
                    break;
                case '1917':
                    result = await mumaker.ephoto("https://en.ephoto360.com/1917-style-text-effect-523.html", text);
                    break;
                case 'arena':
                    result = await mumaker.ephoto("https://en.ephoto360.com/create-cover-arena-of-valor-by-mastering-360.html", text);
                    break;
                case 'hacker':
                    result = await mumaker.ephoto("https://en.ephoto360.com/create-anonymous-hacker-avatars-cyan-neon-677.html", text);
                    break;
                case 'sand':
                    result = await mumaker.ephoto("https://en.ephoto360.com/write-names-and-messages-on-the-sand-online-582.html", text);
                    break;
                case 'blackpink':
                    result = await mumaker.ephoto("https://en.ephoto360.com/create-a-blackpink-style-logo-with-members-signatures-810.html", text);
                    break;
                case 'glitch':
                    result = await mumaker.ephoto("https://en.ephoto360.com/create-digital-glitch-text-effects-online-767.html", text);
                    break;
                case 'fire':
                    result = await mumaker.ephoto("https://en.ephoto360.com/flame-lettering-effect-372.html", text);
                    break;
                default:
                    await sock.sendMessage(chatId, { delete: processingMsg.key });
                    return await sock.sendMessage(chatId, messageTemplates.error("❌ *نوع تأثير غير مدعوم!*\n\n📌 يرجى استخدام أحد التأثيرات المدعومة."));
            }

            // حذف رسالة "جاري التجهيز"
            await sock.sendMessage(chatId, { delete: processingMsg.key });

            if (!result || !result.image) {
                throw new Error('لم يتم استلام رابط الصورة من API');
            }

            await sock.sendMessage(chatId, messageTemplates.success(text, result.image, effectNames[type] || type));
            
            // إظهار تفاعل النجاح
            await sock.sendMessage(chatId, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('خطأ في مولد النصوص:', error);
            await sock.sendMessage(chatId, { delete: processingMsg.key });
            await sock.sendMessage(chatId, messageTemplates.error(`❌ *حدث خطأ!*\n⚠️ ${error.message || 'تعذر إنشاء التأثير. يرجى المحاولة لاحقاً.'}`));
        }
    } catch (error) {
        console.error('خطأ في أمر مولد النصوص:', error);
        await sock.sendMessage(chatId, messageTemplates.error("❌ *حدث خطأ!*\n⚠️ عذراً، حدث خطأ غير متوقع. يرجى المحاولة لاحقاً."));
    }
}

module.exports = textmakerCommand;