const axios = require('axios');

async function spotifyCommand(sock, chatId, message) {
    try {
        const rawText = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';

        const used = (rawText || '').split(/\s+/)[0] || '.سبوتيفاي';
        const query = rawText.slice(used.length).trim();

        if (!query) {
            await sock.sendMessage(chatId, { 
                text: '🎵 *أمر تحميل من سبوتيفاي - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.سبوتيفاي <اسم الأغنية>`\n\n📝 *أمثلة:*\n`.سبوتيفاي con calma`\n`.سبوتيفاي shape of you`\n`.سبوتيفاي عيش أيامك`\n\n✨ *سيتم تحميل الأغنية من سبوتيفاي بصيغة MP3*'
            }, { quoted: message });
            return;
        }

        // إظهار تفاعل "جاري البحث"
        await sock.sendMessage(chatId, {
            react: { text: '🎵', key: message.key }
        });

        // إرسال رسالة "جاري البحث"
        const loadingMsg = await sock.sendMessage(chatId, { 
            text: `🎵 *جاري البحث عن:* ${query}\n⏳ يرجى الانتظار...`
        }, { quoted: message });

        const apiUrl = `https://okatsu-rolezapiiz.vercel.app/search/spotify?q=${encodeURIComponent(query)}`;
        const { data } = await axios.get(apiUrl, { timeout: 20000, headers: { 'user-agent': 'Mozilla/5.0' } });

        if (!data?.status || !data?.result) {
            await sock.sendMessage(chatId, { delete: loadingMsg.key });
            throw new Error('لم يتم العثور على نتائج');
        }

        const r = data.result;
        const audioUrl = r.audio;
        
        if (!audioUrl) {
            await sock.sendMessage(chatId, { delete: loadingMsg.key });
            await sock.sendMessage(chatId, { 
                text: '❌ *لم يتم العثور على رابط تحميل!*\n⚠️ قد تكون الأغنية غير متاحة للتحميل.'
            }, { quoted: message });
            return;
        }

        // حذف رسالة "جاري البحث"
        await sock.sendMessage(chatId, { delete: loadingMsg.key });

        const title = r.title || r.name || 'أغنية بدون عنوان';
        const artist = r.artist || 'فنان غير معروف';
        const duration = r.duration || 'غير معروف';
        const spotifyUrl = r.url || '';

        const caption = `╭━━━≪•🎵 *سـبـوتـيـفـاي* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🎤 *العنوان:* ${title}
┃👨‍🎤 *الفنان:* ${artist}
┃⏱️ *المدة:* ${duration}
┃🔗 *الرابط:* ${spotifyUrl}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        // إرسال معلومات الأغنية مع الصورة إذا وجدت
        if (r.thumbnails) {
            await sock.sendMessage(chatId, { 
                image: { url: r.thumbnails }, 
                caption: caption 
            }, { quoted: message });
        } else if (caption) {
            await sock.sendMessage(chatId, { 
                text: caption 
            }, { quoted: message });
        }

        // إرسال الأغنية
        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: 'audio/mpeg',
            fileName: `${title.replace(/[\\/:*?"<>|]/g, '')}.mp3`,
            ptt: false
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('[خطأ في سبوتيفاي]:', error?.message || error);
        
        let errorMessage = '❌ *فشل جلب الأغنية من سبوتيفاي!*\n';
        
        if (error.message && error.message.includes('timeout')) {
            errorMessage += '⏰ *انتهى الوقت!*\n⚠️ الخادم بطيء حالياً. حاول مرة أخرى بعد قليل.';
        } else if (error.message && error.message.includes('لم يتم العثور')) {
            errorMessage += '🔍 *لم يتم العثور على نتائج!*\n⚠️ حاول باستخدام كلمات بحث مختلفة.';
        } else {
            errorMessage += '⚠️ يرجى المحاولة لاحقاً.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
    }
}

module.exports = spotifyCommand;