const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function viewonceCommand(sock, chatId, message) {
    // استخراج الصورة أو الفيديو من الرسالة المقتبسة
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedImage = quoted?.imageMessage;
    const quotedVideo = quoted?.videoMessage;

    // التحقق من وجود رسالة مقتبسة
    if (!quoted) {
        await sock.sendMessage(chatId, { 
            text: '👁️ *أمر فتح رسائل مرة واحدة - JAWAD.BOT*\n\n📌 *الاستخدام:*\nقم بالرد على رسالة "مرة واحدة" (صورة أو فيديو) وأرسل `.مرة واحدة`\n\n📝 *مثال:*\n1️⃣ اضغط مع الاستمرار على رسالة "مرة واحدة"\n2️⃣ اختر "الرد"\n3️⃣ اكتب `.مرة واحدة`\n4️⃣ أرسل\n\n✨ *سيتم حفظ الوسائط وإرسالها لك!*'
        }, { quoted: message });
        return;
    }

    // معالجة الصورة
    if (quotedImage && quotedImage.viewOnce) {
        try {
            // إظهار تفاعل "جاري التحميل"
            await sock.sendMessage(chatId, {
                react: { text: '👁️', key: message.key }
            });

            const stream = await downloadContentFromMessage(quotedImage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            
            await sock.sendMessage(chatId, { 
                image: buffer, 
                fileName: 'media.jpg', 
                caption: quotedImage.caption || '━━━━━━━━━━━━━━━━━━━━━\n> 👁️ *تم فتح هذه الصورة بواسطة JAWAD.BOT*'
            }, { quoted: message });
            
            // إظهار تفاعل النجاح
            await sock.sendMessage(chatId, {
                react: { text: '✅', key: message.key }
            });
        } catch (error) {
            console.error('خطأ في فتح الصورة:', error);
            await sock.sendMessage(chatId, { 
                text: '❌ *حدث خطأ!*\nتعذر فتح الصورة. يرجى المحاولة لاحقاً.'
            }, { quoted: message });
        }
    } 
    // معالجة الفيديو
    else if (quotedVideo && quotedVideo.viewOnce) {
        try {
            // إظهار تفاعل "جاري التحميل"
            await sock.sendMessage(chatId, {
                react: { text: '👁️', key: message.key }
            });

            const stream = await downloadContentFromMessage(quotedVideo, 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            
            await sock.sendMessage(chatId, { 
                video: buffer, 
                fileName: 'media.mp4', 
                caption: quotedVideo.caption || '━━━━━━━━━━━━━━━━━━━━━\n> 👁️ *تم فتح هذا الفيديو بواسطة JAWAD.BOT*'
            }, { quoted: message });
            
            // إظهار تفاعل النجاح
            await sock.sendMessage(chatId, {
                react: { text: '✅', key: message.key }
            });
        } catch (error) {
            console.error('خطأ في فتح الفيديو:', error);
            await sock.sendMessage(chatId, { 
                text: '❌ *حدث خطأ!*\nتعذر فتح الفيديو. يرجى المحاولة لاحقاً.'
            }, { quoted: message });
        }
    } 
    else {
        await sock.sendMessage(chatId, { 
            text: '❌ *لا توجد رسالة مرة واحدة!*\n\n📌 الرجاء الرد على صورة أو فيديو من نوع "مرة واحدة" (view once).\n\n✨ *نصيحة:* يمكنك التعرف على هذه الرسائل من خلال وجود أيقونة "1" 🔢 عليها.'
        }, { quoted: message });
    }
}

module.exports = viewonceCommand;