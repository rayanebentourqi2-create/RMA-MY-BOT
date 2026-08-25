const fetch = require('node-fetch');

async function lyricsCommand(sock, chatId, songTitle, message) {
    if (!songTitle) {
        await sock.sendMessage(chatId, { 
            text: '🎵 *أمر كلمات الأغاني - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.كلمات <اسم الأغنية>`\n\n📝 *أمثلة:*\n`.كلمات يا حبيبتي`\n`.كلمات Shape of You`\n`.كلمات تخيل`\n\n✨ *سيتم عرض كلمات الأغنية كاملة*'
        }, { quoted: message });
        return;
    }

    try {
        // إظهار تفاعل "جاري البحث"
        await sock.sendMessage(chatId, {
            react: { text: '🎵', key: message.key }
        });

        // إرسال رسالة "جاري البحث"
        const loadingMsg = await sock.sendMessage(chatId, { 
            text: `🎵 *جاري البحث عن كلمات أغنية:* ${songTitle}\n⏳ يرجى الانتظار`
        }, { quoted: message });

        const apiUrl = `https://lyricsapi.fly.dev/api/lyrics?q=${encodeURIComponent(songTitle)}`;
        const res = await fetch(apiUrl);
        
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText);
        }
        
        const data = await res.json();

        const lyrics = data && data.result && data.result.lyrics ? data.result.lyrics : null;
        const title = data && data.result && data.result.title ? data.result.title : songTitle;
        const artist = data && data.result && data.result.artist ? data.result.artist : '';

        if (!lyrics) {
            await sock.sendMessage(chatId, { delete: loadingMsg.key });
            await sock.sendMessage(chatId, {
                text: `❌ *عذراً!*\n⚠️ لم أتمكن من العثور على كلمات لأغنية "${songTitle}".\n\n📌 *نصائح:*\n• تأكد من كتابة اسم الأغنية بشكل صحيح\n• جرب كتابة اسم الأغنية بالإنجليزية\n• جرب الاستعلام عن أغنية أخرى`
            }, { quoted: message });
            return;
        }

        // حذف رسالة "جاري البحث"
        await sock.sendMessage(chatId, { delete: loadingMsg.key });

        // تنسيق الكلمات
        let output = `╭━━━≪•🎵 *كـلـمـات الأغـنـيـة* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🎤 *الأغنية:* ${title}
${artist ? `┃👨‍🎤 *الفنان:* ${artist}` : ''}
┃━━━━━━━━━━━━━━━━━━━━━
┃📝 *الكلمات:*
┃━━━━━━━━━━━━━━━━━━━━━
┃${lyrics}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        // إذا كانت الكلمات طويلة جداً، تقسيمها
        const maxChars = 4000;
        if (output.length > maxChars) {
            // إرسال الأجزاء الأولى
            const firstPart = output.slice(0, maxChars - 100) + '\n┃━━━━━━━━━━━━━━━━━━━━━\n┃📌 *تكملة الكلمات في الرسالة التالية...*';
            await sock.sendMessage(chatId, { text: firstPart }, { quoted: message });
            
            // إرسال الباقي
            const remaining = lyrics.slice(maxChars - 500);
            const secondPart = `╭━━━≪•🎵 *كـلـمـات الأغـنـيـة (مكمل)* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🎤 *الأغنية:* ${title}
┃━━━━━━━━━━━━━━━━━━━━━
┃📝 ${remaining}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
            await sock.sendMessage(chatId, { text: secondPart }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { text: output }, { quoted: message });
        }

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر كلمات الأغنية:', error);
        await sock.sendMessage(chatId, { 
            text: `❌ *حدث خطأ!*\n⚠️ تعذر الحصول على كلمات أغنية "${songTitle}". يرجى المحاولة لاحقاً.`
        }, { quoted: message });
    }
}

module.exports = { lyricsCommand };