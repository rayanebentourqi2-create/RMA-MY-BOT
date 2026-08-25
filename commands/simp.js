const fetch = require('node-fetch');

async function simpCommand(sock, chatId, quotedMsg, mentionedJid, sender, message) {
    try {
        // تحديد المستخدم المستهدف
        let who = quotedMsg 
            ? quotedMsg.sender 
            : mentionedJid && mentionedJid[0] 
                ? mentionedJid[0] 
                : sender;

        // إظهار تفاعل "جاري المعالجة"
        await sock.sendMessage(chatId, {
            react: { text: '😍', key: message.key }
        });

        // إرسال رسالة "جاري التحميل"
        const loadingMsg = await sock.sendMessage(chatId, { 
            text: '😍 *جاري إنشاء بطاقة سيمب...*\n⏳ يرجى الانتظار'
        }, { quoted: message });

        // الحصول على رابط الصورة الشخصية
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
        } catch (nameError) {
            // استخدام رقم الهاتف إذا فشل جلب الاسم
        }

        // جلب بطاقة السيمب من API
        const apiUrl = `https://some-random-api.com/canvas/misc/simpcard?avatar=${encodeURIComponent(avatarUrl)}`;
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        // الحصول على الصورة
        const imageBuffer = await response.buffer();

        // حذف رسالة "جاري التحميل"
        await sock.sendMessage(chatId, { delete: loadingMsg.key });

        // إرسال الصورة مع التسمية
        const caption = `╭━━━≪•😍 *بـطـاقـة سـيـمـب* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃👤 *المستخدم:* ${userName}
┃💕 *المستوى:* سيمب محترف 😍
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        await sock.sendMessage(chatId, {
            image: imageBuffer,
            caption: caption,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363427092431731@newsletter',
                    newsletterName: 'JAWAD.BOT',
                    serverMessageId: -1
                }
            }
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر بطاقة السيمب:', error);
        
        let errorMessage = '❌ *عذراً، لم أتمكن من إنشاء بطاقة السيمب!*\n⚠️ يرجى المحاولة لاحقاً.';
        
        if (error.message && error.message.includes('fetch')) {
            errorMessage = '🌐 *خطأ في الاتصال!*\n⚠️ تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363427092431731@newsletter',
                    newsletterName: 'JAWAD.BOT',
                    serverMessageId: -1
                }
            }
        }, { quoted: message });
    }
}

module.exports = { simpCommand };