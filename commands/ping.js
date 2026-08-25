const os = require('os');
const settings = require('../settings.js');

function formatTime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    seconds = seconds % (24 * 60 * 60);
    const hours = Math.floor(seconds / (60 * 60));
    seconds = seconds % (60 * 60);
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);

    let time = '';
    if (days > 0) time += `${days} يوم `;
    if (hours > 0) time += `${hours} ساعة `;
    if (minutes > 0) time += `${minutes} دقيقة `;
    if (seconds > 0 || time === '') time += `${seconds} ثانية`;

    return time.trim();
}

async function pingCommand(sock, chatId, message) {
    try {
        // إظهار تفاعل "جاري القياس"
        await sock.sendMessage(chatId, {
            react: { text: '🏓', key: message.key }
        });

        const start = Date.now();
        const sentMsg = await sock.sendMessage(chatId, { text: '🏓 *جاري قياس سرعة الاتصال...*' }, { quoted: message });
        const end = Date.now();
        const ping = Math.round((end - start) / 2);

        const uptimeInSeconds = process.uptime();
        const uptimeFormatted = formatTime(uptimeInSeconds);

        // الحصول على معلومات الذاكرة المستخدمة
        const usedMemory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
        const freeMemory = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);

        // حذف رسالة القياس المؤقتة
        await sock.sendMessage(chatId, { delete: sentMsg.key });

        const botInfo = `╭━━━≪•🏓 *مـعـلـومـات الـبـوت* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🚀 *سرعة البوت:* ${ping} مللي ثانية
┃━━━━━━━━━━━━━━━━━━━━━
┃⏱️ *مدة التشغيل:* ${uptimeFormatted}
┃━━━━━━━━━━━━━━━━━━━━━
┃📌 *الإصدار:* v${settings.version || '2.0.0'}
┃━━━━━━━━━━━━━━━━━━━━━
┃💾 *الذاكرة المستخدمة:* ${usedMemory} ميجابايت
┃💿 *الذاكرة الكلية:* ${totalMemory} جيجابايت
┃📊 *الذاكرة الحرة:* ${freeMemory} جيجابايت
┃━━━━━━━━━━━━━━━━━━━━━
┃👨‍💻 *المطور:* ${settings.botOwner || 'DarkXecutor'}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        await sock.sendMessage(chatId, { text: botInfo }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر البينغ:', error);
        
        // رسالة بديلة في حالة الخطأ
        const uptimeInSeconds = process.uptime();
        const uptimeFormatted = formatTime(uptimeInSeconds);
        
        const fallbackInfo = `🤖 *JAWAD.BOT*\n\n🏓 *السرعة:* متوسطة\n⏱️ *مدة التشغيل:* ${uptimeFormatted}\n📌 *الإصدار:* v${settings.version || '2.0.0'}`;
        
        await sock.sendMessage(chatId, { text: fallbackInfo }, { quoted: message });
    }
}

module.exports = pingCommand;