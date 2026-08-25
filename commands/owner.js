const settings = require('../settings');

async function ownerCommand(sock, chatId, message) {
    try {
        // إظهار تفاعل "جاري التحميل"
        await sock.sendMessage(chatId, {
            react: { text: '👨‍💻', key: message?.key || {} }
        });

        // معلومات المطور
        const ownerNumber = settings.ownerNumber || '1234567890';
        const botOwner = settings.botOwner || 'DarkXecutor';
        const botName = settings.botName || 'JAWAD.BOT';
        
        // إنشاء بطاقة اتصال المطور
        const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${botOwner}
ORG:${botName}
TITLE:مطور البوت
TEL;waid=${ownerNumber}:${ownerNumber}
URL:${global.channelLink || ''}
NOTE:مطور بوت ${botName}\nقناة البوت: ${global.channelLink || ''}\nيوتيوب: ${global.ytch || ''}
END:VCARD`;

        // إرسال معلومات المطور كنص أولاً
        const textMessage = `╭━━━≪•👨‍💻 *مـطـور الـبـوت* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃📛 *الاسم:* ${botOwner}
┃📱 *الرقم:* wa.me/${ownerNumber}
┃━━━━━━━━━━━━━━━━━━━━━
┃📢 *قناة البوت:* 
┃${global.channelLink || 'https://whatsapp.com/channel/0029Vb7kJt29Gv7W5J0McQ09'}
┃━━━━━━━━━━━━━━━━━━━━━
┃💬 *مجموعة الدعم:* 
┃${global.supportGroup || 'https://chat.whatsapp.com/LqoheqNRThHLBDbMCwvV7J'}
┃━━━━━━━━━━━━━━━━━━━━━
┃🎬 *يوتيوب:* ${global.ytch || 'jawad_bot'}
┃━━━━━━━━━━━━━━━━━━━━━
┃💡 *للاستفسارات والدعم، تواصل مع المطور*
╰━━━≪•🤖 *${botName}* •≫━━━╯`;

        await sock.sendMessage(chatId, { text: textMessage }, { quoted: message });

        // إرسال بطاقة الاتصال
        await sock.sendMessage(chatId, {
            contacts: { 
                displayName: botOwner, 
                contacts: [{ vcard }] 
            },
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message?.key || {} }
        });

    } catch (error) {
        console.error('خطأ في أمر المطور:', error);
        
        // رسالة بديلة في حالة الخطأ
        const ownerNumber = settings.ownerNumber || '1234567890';
        const botOwner = settings.botOwner || 'DarkXecutor';
        
        const fallbackMessage = `👨‍💻 *مطور البوت*\n\n📛 *الاسم:* ${botOwner}\n📱 *الرقم:* wa.me/${ownerNumber}\n📢 *قناة البوت:* ${global.channelLink || 'https://whatsapp.com/channel/0029Vb7kJt29Gv7W5J0McQ09'}`;
        
        await sock.sendMessage(chatId, { text: fallbackMessage }, { quoted: message });
    }
}

module.exports = ownerCommand;