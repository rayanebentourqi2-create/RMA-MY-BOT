const axios = require('axios');

async function soraCommand(sock, chatId, message) {
    try {
        const rawText = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';

        // استخراج النص بعد الأمر
        const used = (rawText || '').split(/\s+/)[0] || '.سورا';
        const args = rawText.slice(used.length).trim();
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || '';
        const input = args || quotedText;

        if (!input) {
            await sock.sendMessage(chatId, { 
                text: '🎬 *أمر تحويل النص إلى فيديو - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.سورا <وصف الفيديو>`\n\n📝 *أمثلة:*\n`.سورا فتاة أنمي بشعر أزرق قصير`\n`.سورا منظر طبيعي مع شلالات`\n`.سورا قطط تلعب في الحديقة`\n\n✨ *سيتم إنشاء فيديو حسب وصفك باستخدام الذكاء الاصطناعي*\n⏱️ *قد يستغرق التوليد 20-30 ثانية*'
            }, { quoted: message });
            return;
        }

        // إظهار تفاعل "جاري التوليد"
        await sock.sendMessage(chatId, {
            react: { text: '🎬', key: message.key }
        });

        // إرسال رسالة "جاري التوليد"
        const processingMsg = await sock.sendMessage(chatId, { 
            text: `🎬 *جاري إنشاء الفيديو...*\n📝 *الوصف:* ${input.substring(0, 100)}${input.length > 100 ? '...' : ''}\n⏳ يرجى الانتظار، قد يستغرق هذا 20-30 ثانية.`
        }, { quoted: message });

        const apiUrl = `https://okatsu-rolezapiiz.vercel.app/ai/txt2video?text=${encodeURIComponent(input)}`;
        const { data } = await axios.get(apiUrl, { timeout: 90000, headers: { 'user-agent': 'Mozilla/5.0' } });

        const videoUrl = data?.videoUrl || data?.result || data?.data?.videoUrl;
        if (!videoUrl) {
            throw new Error('لم يتم العثور على رابط الفيديو في رد API');
        }

        // حذف رسالة "جاري التوليد"
        await sock.sendMessage(chatId, { delete: processingMsg.key });

        const caption = `╭━━━≪•🎬 *تـولـيـد فـيـديـو* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🎬 *تم الإنشاء بواسطة:* JAWAD.BOT
┃📝 *الوصف:* ${input.substring(0, 80)}${input.length > 80 ? '...' : ''}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        await sock.sendMessage(chatId, {
            video: { url: videoUrl },
            mimetype: 'video/mp4',
            caption: caption
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('[خطأ في سورا]:', error?.message || error);
        
        let errorMessage = '❌ *فشل إنشاء الفيديو!*\n';
        
        if (error.message && error.message.includes('timeout')) {
            errorMessage += '⏰ *انتهى الوقت!*\n⚠️ استغرق الطلب وقتاً طويلاً. حاول بوصف أقصر أو أبسط.';
        } else if (error.message && error.message.includes('No videoUrl')) {
            errorMessage += '🎬 *لم يتم إنشاء فيديو!*\n⚠️ حاول بوصف مختلف أو أبسط.';
        } else {
            errorMessage += '⚠️ يرجى المحاولة لاحقاً. جرب وصفاً مختلفاً.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
    }
}

module.exports = soraCommand;