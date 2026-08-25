/**
 * إعدادات القناة للرسائل المعاد توجيهها
 * تستخدم هذه الإعدادات عند إعادة توجيه الرسائل أو إرسال محتوى من البوت
 */

const channelInfo = {
    contextInfo: {
        forwardingScore: 1,           // عدد مرات إعادة التوجيه
        isForwarded: true,            // تم إعادة توجيه هذه الرسالة
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363427092431731@newsletter',  // معرف قناة JAWAD.BOT
            newsletterName: 'JAWAD.BOT',                     // اسم القناة
            serverMessageId: -1
        }
    }
};

// إعدادات إضافية للقناة (يمكن استخدامها في أماكن أخرى)
const newsletterConfig = {
    jid: '120363427092431731@newsletter',
    name: 'JAWAD.BOT',
    link: 'https://whatsapp.com/channel/0029Vb7kJt29Gv7W5J0McQ09'
};

// إعدادات متنوعة للرسائل
const messageConfig = {
    // إعدادات إعادة التوجيه
    forwarding: {
        score: 1,
        isForwarded: true
    },
    
    // إعدادات القناة
    channel: newsletterConfig,
    
    // إعدادات البوت
    bot: {
        name: 'JAWAD.BOT',
        developer: 'DarkXecutor'
    }
};

module.exports = {
    channelInfo,
    newsletterConfig,
    messageConfig
};