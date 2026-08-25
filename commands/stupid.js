const fetch = require('node-fetch');

async function stupidCommand(sock, chatId, quotedMsg, mentionedJid, sender, args, message) {
    try {
        // تحديد المستخدم المستهدف
        let who = quotedMsg 
            ? quotedMsg.sender 
            : mentionedJid && mentionedJid[0] 
                ? mentionedJid[0] 
                : sender;

        // الحصول على النص لبطاقة "غبي جداً"
        let text = args && args.length > 0 ? args.join(' ') : '';
        
        if (!text && !quotedMsg && (!mentionedJid || mentionedJid.length === 0)) {
            await sock.sendMessage(chatId, { 
                text: '🤪 *أمر بطاقة "غبي جداً" - JAWAD.BOT*\n\n📌 *الاستخدام:*\n• `.غبي @مستخدم` - بطاقة غبي للمستخدم\n• `.غبي نص` - بطاقة مع نص مخصص\n• `.غبي @مستخدم نص` - بطاقة مخصصة لمستخدم\n\n📝 *أمثلة:*\n`.غبي @DarkXecutor`\n`.غبي كلام غبي`\n`.غبي @DarkXecutor سبب طرده`\n\n✨ *سيتم إنشاء بطاقة "غبي جداً" للشخص المختار*'
            }, { quoted: message });
            return;
        }

        // إظهار تفاعل "جاري المعالجة"
        await sock.sendMessage(chatId, {
            react: { text: '🤪', key: message.key }
        });

        // إرسال رسالة "جاري التحميل"
        const loadingMsg = await sock.sendMessage(chatId, { 
            text: '🤪 *جاري إنشاء بطاقة غبي جداً...*\n⏳ يرجى الانتظار'
        }, { quoted: message });

        // الحصول على الصورة الشخصية
        let avatarUrl;
        try {
            avatarUrl = await sock.profilePictureUrl(who, 'image');
        } catch (error) {
            console.error('خطأ في جلب الصورة الشخصية:', error);
            avatarUrl = 'https://telegra.ph/file/24fa902ead26340f3df2c.png'; // صورة افتراضية
        }

        // الحصول على اسم المستخدم
        let userName = who.split('@')[0];
        try {
            const contact = await sock.getBusinessProfile(who);
            if (contact && contact.name) {
                userName = contact.name;
            }
        } catch (nameError) {}

        // تنسيق النص للرابط (استبدال المسافات بعلامة +)
        let displayText = text || 'غبي جداً';
        let encodedText = text ? text.replace(/ /g, '+') : 'غبي+جداً';

        // جلب بطاقة "غبي جداً" من API
        const apiUrl = `https://some-random-api.com/canvas/misc/its-so-stupid?avatar=${encodeURIComponent(avatarUrl)}&dog=${encodeURIComponent(encodedText)}`;
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        // الحصول على الصورة
        const imageBuffer = await response.buffer();

        // حذف رسالة "جاري التحميل"
        await sock.sendMessage(chatId, { delete: loadingMsg.key });

        const caption = `╭━━━≪•🤪 *بـطـاقـة غـبـي جـداً* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃👤 *الشخص:* ${userName}
┃📝 *السبب:* ${displayText}
┃━━━━━━━━━━━━━━━━━━━━━
┃💡 ${text ? 'هذا ما جعله يبدو غبياً!' : 'لا تعليق... 🤪'}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        // إرسال الصورة
        await sock.sendMessage(chatId, {
            image: imageBuffer,
            caption: caption,
            mentions: [who]
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر بطاقة غبي جداً:', error);
        
        let errorMessage = '❌ *عذراً، لم أتمكن من إنشاء بطاقة "غبي جداً"!*\n⚠️ يرجى المحاولة لاحقاً.';
        
        if (error.message && error.message.includes('fetch')) {
            errorMessage = '🌐 *خطأ في الاتصال!*\n⚠️ تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
    }
}

module.exports = { stupidCommand };