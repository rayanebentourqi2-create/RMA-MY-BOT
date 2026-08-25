const fetch = require('node-fetch');

async function dareCommand(sock, chatId, message) {
    try {
        // إظهار تفاعل "جاري البحث"
        await sock.sendMessage(chatId, {
            react: { text: '😈', key: message.key }
        });

        // إرسال رسالة "جاري التحميل"
        const loadingMsg = await sock.sendMessage(chatId, { 
            text: '😈 *جاري البحث عن تحدٍ جديد...*\n⏳ يرجى الانتظار'
        }, { quoted: message });

        const shizokeys = 'shizo';
        const res = await fetch(`https://shizoapi.onrender.com/api/texts/dare?apikey=${shizokeys}`);
        
        if (!res.ok) {
            throw await res.text();
        }
        
        const json = await res.json();
        const dareMessage = json.result;

        // حذف رسالة "جاري التحميل"
        await sock.sendMessage(chatId, { delete: loadingMsg.key });

        // إرسال رسالة الجرأة بتنسيق جميل
        const formattedMessage = `╭━━━≪•😈 *الـجـرأة* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🔥 *التحدي:* 
┃━━━━━━━━━━━━━━━━━━━━━
┃📝 ${dareMessage}
┃━━━━━━━━━━━━━━━━━━━━━
┃💪 *نصيحة:* كن شجاعاً وافعلها!
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
        console.error('خطأ في أمر الجرأة:', error);
        
        let errorMessage = '❌ *حدث خطأ!*\n⚠️ تعذر الحصول على تحدي جرأة. يرجى المحاولة لاحقاً.';
        
        if (error.message && error.message.includes('fetch')) {
            errorMessage = '❌ *خطأ في الاتصال!*\n⚠️ تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
    }
}

module.exports = { dareCommand };