const fetch = require('node-fetch');

async function handleSsCommand(sock, chatId, message, match) {
    if (!match) {
        await sock.sendMessage(chatId, {
            text: `📸 *أمر تصوير المواقع - JAWAD.BOT*\n\n📌 *الاستخدام:*\n*.تصوير <رابط الموقع>*\n*.تصوير https://example.com*\n\n📝 *مثال:*\n*.تصوير https://google.com*\n*.تصوير https://whatsapp.com*\n\n✨ *سيتم التقاط صورة للموقع وإرسالها*\n\n⚠️ *ملاحظة:* قد لا تعمل بعض المواقع التي تمنع التصوير.`,
            quoted: message
        });
        return;
    }

    try {
        // إظهار تفاعل "جاري التصوير"
        await sock.sendMessage(chatId, {
            react: { text: '📸', key: message.key }
        });

        // إظهار مؤشر الكتابة
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('composing', chatId);

        // استخراج الرابط من الأمر
        const url = match.trim();
        
        // التحقق من صحة الرابط
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return sock.sendMessage(chatId, {
                text: '❌ *رابط غير صالح!*\n📌 يرجى تقديم رابط صحيح يبدأ بـ http:// أو https://\n📝 مثال: `.تصوير https://google.com`',
                quoted: message
            });
        }

        // إرسال رسالة "جاري التصوير"
        const processingMsg = await sock.sendMessage(chatId, { 
            text: `📸 *جاري تصوير الموقع:* ${url}\n⏳ يرجى الانتظار...`
        }, { quoted: message });

        // استدعاء API
        const apiUrl = `https://api.siputzx.my.id/api/tools/ssweb?url=${encodeURIComponent(url)}&theme=light&device=desktop`;
        const response = await fetch(apiUrl, { headers: { 'accept': '*/*' } });
        
        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        // الحصول على الصورة
        const imageBuffer = await response.buffer();

        // حذف رسالة "جاري التصوير"
        await sock.sendMessage(chatId, { delete: processingMsg.key });

        const caption = `╭━━━≪•📸 *تـصـويـر مـوقـع* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🔗 *الرابط:* ${url}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        // إرسال الصورة
        await sock.sendMessage(chatId, {
            image: imageBuffer,
            caption: caption
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('❌ خطأ في أمر التصوير:', error);
        
        let errorMessage = '❌ *فشل تصوير الموقع!*\n\n';
        
        if (error.message && error.message.includes('Invalid URL')) {
            errorMessage += '📌 *الرابط غير صالح*\n• تأكد من كتابة الرابط بشكل صحيح\n• تأكد من أن الرابط يعمل في المتصفح';
        } else if (error.message && error.message.includes('timeout')) {
            errorMessage += '⏰ *انتهى الوقت!*\n• الموقع بطيء جداً\n• حاول مرة أخرى بعد قليل';
        } else if (error.response?.status === 403 || error.response?.status === 404) {
            errorMessage += '🚫 *الموقع يمنع التصوير!*\n• بعض المواقع تمنع أخذ لقطات شاشة\n• جرب موقعاً آخر';
        } else {
            errorMessage += '⚠️ *الأسباب المحتملة:*\n• الرابط غير صحيح\n• الموقع متوقف مؤقتاً\n• الخدمة غير متاحة حالياً\n• الموقع يمنع التصوير';
        }
        
        errorMessage += '\n\n📝 *مثال صحيح:*\n`.تصوير https://google.com`';
        
        await sock.sendMessage(chatId, {
            text: errorMessage,
            quoted: message
        });
    }
}

module.exports = {
    handleSsCommand
};