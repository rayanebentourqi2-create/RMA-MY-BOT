const axios = require('axios');
const { fetchBuffer } = require('../lib/myfunc');

async function imagineCommand(sock, chatId, message) {
    try {
        // الحصول على النص من الرسالة
        const prompt = message.message?.conversation?.trim() || 
                      message.message?.extendedTextMessage?.text?.trim() || '';
        
        // إزالة بادئة الأمر
        const imagePrompt = prompt.slice(8).trim();
        
        if (!imagePrompt) {
            await sock.sendMessage(chatId, {
                text: '🎨 *أمر توليد الصور - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.تخيل <وصف الصورة>`\n\n📝 *أمثلة:*\n`.تخيل غروب الشمس على البحر`\n`.تخيل قطة لطيفة تجلس على القمر`\n`.تخيل منظر طبيعي ساحر مع شلالات`\n\n✨ *سيتم إنشاء صورة حسب وصفك باستخدام الذكاء الاصطناعي*'
            }, { quoted: message });
            return;
        }

        // إظهار تفاعل "جاري التوليد"
        await sock.sendMessage(chatId, {
            react: { text: '🎨', key: message.key }
        });

        // إرسال رسالة "جاري التوليد"
        const processingMsg = await sock.sendMessage(chatId, {
            text: `🎨 *جاري إنشاء الصورة...*\n📝 *الوصف:* ${imagePrompt}\n⏳ يرجى الانتظار، قد يستغرق هذا 15-30 ثانية.`
        }, { quoted: message });

        // تحسين الوصف بجودة عالية
        const enhancedPrompt = enhancePrompt(imagePrompt);

        // طلب API
        const response = await axios.get(`https://shizoapi.onrender.com/api/ai/imagine?apikey=shizo&query=${encodeURIComponent(enhancedPrompt)}`, {
            responseType: 'arraybuffer',
            timeout: 60000
        });

        // حذف رسالة "جاري التوليد"
        await sock.sendMessage(chatId, { delete: processingMsg.key });

        // تحويل الرد إلى Buffer
        const imageBuffer = Buffer.from(response.data);

        // إضافة توقيع البوت على الصورة
        const caption = `╭━━━≪•🎨 *تـولـيـد الـصـور* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🎨 *تم الإنشاء بواسطة:* JAWAD.BOT
┃📝 *الوصف:* ${imagePrompt}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        // إرسال الصورة المولدة
        await sock.sendMessage(chatId, {
            image: imageBuffer,
            caption: caption
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر توليد الصورة:', error);
        
        let errorMessage = '❌ *فشل إنشاء الصورة!*\n⚠️ يرجى المحاولة لاحقاً.\n\n📌 *نصيحة:* حاول بوصف أقصر وأكثر تحديداً.';
        
        if (error.response && error.response.status === 429) {
            errorMessage = '⏳ *تم الوصول للحد الأقصى!*\n⚠️ هناك عدد كبير من الطلبات. يرجى الانتظار ثم المحاولة مرة أخرى.';
        } else if (error.code === 'ECONNABORTED') {
            errorMessage = '⏰ *انتهى الوقت!*\n⚠️ استغرق الطلب وقتاً طويلاً. حاول بوصف أقصر.';
        }
        
        await sock.sendMessage(chatId, {
            text: errorMessage
        }, { quoted: message });
    }
}

// دالة تحسين الوصف بإضافة كلمات جودة
function enhancePrompt(prompt) {
    const qualityEnhancers = [
        'جودة عالية',
        'مفصلة',
        'تحفة فنية',
        'أفضل جودة',
        'واقعية فائقة',
        '4K',
        'مفصلة بدقة',
        'تصوير احترافي',
        'إضاءة سينمائية',
        'تركيز حاد',
        'ألوان زاهية',
        'خلفية جميلة',
        'تفاصيل دقيقة'
    ];

    const numEnhancers = Math.floor(Math.random() * 2) + 3;
    const selectedEnhancers = qualityEnhancers
        .sort(() => Math.random() - 0.5)
        .slice(0, numEnhancers);

    return `${prompt}، ${selectedEnhancers.join('، ')}`;
}

module.exports = imagineCommand;