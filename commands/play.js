const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();
        
        if (!searchQuery) {
            return await sock.sendMessage(chatId, { 
                text: "🎵 *أمر تشغيل الأغاني - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.شغل <اسم الأغنية>`\n\n📝 *مثال:*\n`.شغل عبد الحليم حبيبها`\n`.شغل Shape of You`\n\n✨ *سيتم تحميل وتشغيل الأغنية مباشرة*"
            }, { quoted: message });
        }

        // إظهار تفاعل "جاري البحث"
        await sock.sendMessage(chatId, {
            react: { text: '🎵', key: message.key }
        });

        // إرسال رسالة "جاري البحث"
        const loadingMsg = await sock.sendMessage(chatId, {
            text: `🎵 *جاري البحث عن:* ${searchQuery}\n⏳ يرجى الانتظار...`
        }, { quoted: message });

        // البحث عن الأغنية
        const { videos } = await yts(searchQuery);
        if (!videos || videos.length === 0) {
            await sock.sendMessage(chatId, { delete: loadingMsg.key });
            return await sock.sendMessage(chatId, { 
                text: "❌ *لم يتم العثور على أغاني!*\n📌 حاول باستخدام كلمات بحث مختلفة."
            }, { quoted: message });
        }

        // الحصول على أول نتيجة
        const video = videos[0];
        const urlYt = video.url;
        const videoTitle = video.title;
        const videoDuration = video.timestamp;
        const videoViews = video.views;
        const videoAuthor = video.author.name;

        // تحديث رسالة التحميل
        await sock.sendMessage(chatId, { delete: loadingMsg.key });
        
        const downloadingMsg = await sock.sendMessage(chatId, {
            text: `📥 *جاري تحميل:* ${videoTitle}\n⏳ يرجى الانتظار، قد يستغرق هذا بضع ثوانٍ...`
        }, { quoted: message });

        // جلب رابط التحميل من API
        const response = await axios.get(`https://apis-keith.vercel.app/download/dlmp3?url=${urlYt}`, {
            timeout: 30000
        });
        const data = response.data;

        if (!data || !data.status || !data.result || !data.result.downloadUrl) {
            await sock.sendMessage(chatId, { delete: downloadingMsg.key });
            return await sock.sendMessage(chatId, { 
                text: "❌ *فشل تحميل الأغنية!*\n⚠️ يرجى المحاولة لاحقاً."
            }, { quoted: message });
        }

        const audioUrl = data.result.downloadUrl;
        const title = data.result.title || videoTitle;

        // حذف رسالة التحميل
        await sock.sendMessage(chatId, { delete: downloadingMsg.key });

        // إرسال معلومات الأغنية
        const infoMessage = `╭━━━≪•🎵 *الآن جارٍ التشغيل* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🎤 *العنوان:* ${title.substring(0, 50)}
┃👨‍🎤 *الفنان:* ${videoAuthor}
┃⏱️ *المدة:* ${videoDuration}
┃👁️ *المشاهدات:* ${videoViews.toLocaleString()}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        await sock.sendMessage(chatId, { text: infoMessage }, { quoted: message });

        // إرسال الأغنية
        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: "audio/mpeg",
            fileName: `${title}.mp3`,
            ptt: false
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر شغل الأغنية:', error);
        
        let errorMessage = '❌ *فشل التحميل!*\n⚠️ يرجى المحاولة لاحقاً.';
        
        if (error.message && error.message.includes('timeout')) {
            errorMessage = '⏰ *انتهى الوقت!*\n⚠️ الخادم بطيء حالياً. حاول مرة أخرى بعد قليل.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
    }
}

module.exports = playCommand;