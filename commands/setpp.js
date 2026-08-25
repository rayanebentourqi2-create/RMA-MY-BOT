const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const isOwnerOrSudo = require('../lib/isOwner');

async function setProfilePicture(sock, chatId, msg) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!msg.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { 
                text: '⛔ *غير مصرح!*\n👑 هذا الأمر متاح فقط لمطور البوت!' 
            }, { quoted: msg });
            return;
        }

        // التحقق من وجود رد على رسالة
        const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMessage) {
            await sock.sendMessage(chatId, { 
                text: '🖼️ *تغيير صورة البوت - JAWAD.BOT*\n\n📌 *الاستخدام:*\nقم بالرد على صورة وأرسل:\n`.صورتي`\n\n📝 *مثال:*\n1️⃣ أرسل صورة\n2️⃣ رد على الصورة بـ `.صورتي`\n3️⃣ ستتغير صورة البوت الشخصية' 
            }, { quoted: msg });
            return;
        }

        // التحقق من أن الرسالة المقتبسة تحتوي على صورة
        const imageMessage = quotedMessage.imageMessage || quotedMessage.stickerMessage;
        if (!imageMessage) {
            await sock.sendMessage(chatId, { 
                text: '❌ *خطأ!*\n⚠️ الرسالة المقتبسة يجب أن تحتوي على صورة أو ملصق.' 
            }, { quoted: msg });
            return;
        }

        // إظهار تفاعل "جاري التغيير"
        await sock.sendMessage(chatId, {
            react: { text: '🖼️', key: msg.key }
        });

        // إرسال رسالة "جاري المعالجة"
        const processingMsg = await sock.sendMessage(chatId, { 
            text: '🖼️ *جاري تغيير صورة البوت الشخصية...*\n⏳ يرجى الانتظار'
        }, { quoted: msg });

        // إنشاء مجلد مؤقت
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // تحميل الصورة
        const stream = await downloadContentFromMessage(imageMessage, 'image');
        let buffer = Buffer.from([]);
        
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const imagePath = path.join(tempDir, `profile_${Date.now()}.jpg`);
        
        // حفظ الصورة
        fs.writeFileSync(imagePath, buffer);

        // تغيير الصورة الشخصية
        await sock.updateProfilePicture(sock.user.id, { url: imagePath });

        // حذف الملف المؤقت
        try { fs.unlinkSync(imagePath); } catch(e) {}

        // حذف رسالة "جاري المعالجة"
        await sock.sendMessage(chatId, { delete: processingMsg.key });

        const successMessage = `╭━━━≪•🖼️ *تـغـيـيـر صـورة الـبـوت* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃✅ *تم تغيير صورة البوت الشخصية بنجاح!*
┃━━━━━━━━━━━━━━━━━━━━━
┃🖼️ *الصورة الجديدة:* ${imageMessage.caption ? imageMessage.caption.substring(0, 50) : 'تم التحديث'}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        await sock.sendMessage(chatId, { 
            text: successMessage
        }, { quoted: msg });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: msg.key }
        });

    } catch (error) {
        console.error('خطأ في تغيير صورة البوت:', error);
        
        let errorMessage = '❌ *فشل تغيير صورة البوت!*\n';
        
        if (error.message && error.message.includes('image')) {
            errorMessage += '⚠️ تأكد من أن الملف صورة صالحة (JPEG/PNG).';
        } else if (error.message && error.message.includes('size')) {
            errorMessage += '⚠️ حجم الصورة كبير جداً. يرجى استخدام صورة أقل من 5 ميجابايت.';
        } else {
            errorMessage += '⚠️ يرجى المحاولة لاحقاً.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: msg });
    }
}

module.exports = setProfilePicture;