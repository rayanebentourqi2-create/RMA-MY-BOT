const fetch = require('node-fetch');

async function truthCommand(sock, chatId, message) {
    try {
        // إظهار تفاعل "جاري البحث"
        await sock.sendMessage(chatId, {
            react: { text: '🤔', key: message.key }
        });

        // إرسال رسالة "جاري التحميل"
        const loadingMsg = await sock.sendMessage(chatId, { 
            text: '💭 *جاري البحث عن حقيقة عشوائية...*\n⏳ يرجى الانتظار'
        }, { quoted: message });

        const shizokeys = 'shizo';
        const res = await fetch(`https://shizoapi.onrender.com/api/texts/truth?apikey=${shizokeys}`);
        
        if (!res.ok) {
            throw await res.text();
        }
        
        const json = await res.json();
        const truthMessage = json.result;

        // حذف رسالة "جاري التحميل"
        await sock.sendMessage(chatId, { delete: loadingMsg.key });

        // إرسال رسالة الحقيقة بتنسيق جميل
        const formattedMessage = `╭━━━≪•💭 *الـحـقـيـقـة* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃✨ *سؤال الحقيقة:* 
┃━━━━━━━━━━━━━━━━━━━━━
┃📝 ${truthMessage}
┃━━━━━━━━━━━━━━━━━━━━━
┃💡 *نصيحة:* كن صادقاً في إجابتك!
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        await sock.sendMessage(chatId, { 
            text: formattedMessage
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر الحقيقة:', error);
        
        let errorMessage = '❌ *حدث خطأ!*\n⚠️ تعذر الحصول على حقيقة. يرجى المحاولة لاحقاً.';
        
        if (error.message && error.message.includes('fetch')) {
            errorMessage = '❌ *خطأ في الاتصال!*\n⚠️ تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
    }
}

module.exports = { truthCommand };