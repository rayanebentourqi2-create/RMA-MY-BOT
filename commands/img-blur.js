const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const sharp = require('sharp');

async function blurCommand(sock, chatId, message, quotedMessage) {
    try {
        // الحصول على الصورة لتعتيمها
        let imageBuffer;
        
        if (quotedMessage) {
            // الرد على رسالة تحتوي على صورة
            if (!quotedMessage.imageMessage) {
                await sock.sendMessage(chatId, { 
                    text: '❌ *خطأ!*\n⚠️ الرجاء الرد على رسالة تحتوي على صورة.' 
                }, { quoted: message });
                return;
            }
            
            const quoted = {
                message: {
                    imageMessage: quotedMessage.imageMessage
                }
            };
            
            imageBuffer = await downloadMediaMessage(
                quoted,
                'buffer',
                { },
                { }
            );
        } else if (message.message?.imageMessage) {
            // إذا كانت الصورة في الرسالة الحالية
            imageBuffer = await downloadMediaMessage(
                message,
                'buffer',
                { },
                { }
            );
        } else {
            await sock.sendMessage(chatId, { 
                text: '🎨 *أمر تعتيم الصورة - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.ضبابية` (رد على صورة)\n\n📝 *مثال:*\n1️⃣ أرسل صورة\n2️⃣ رد على الصورة بـ `.ضبابية`\n\n✨ *سيتم تعتيم الصورة وإرسالها*'
            }, { quoted: message });
            return;
        }

        // إظهار تفاعل "جاري المعالجة"
        await sock.sendMessage(chatId, {
            react: { text: '🎨', key: message.key }
        });

        // إرسال رسالة "جاري التعتيم"
        const processingMsg = await sock.sendMessage(chatId, { 
            text: '🎨 *جاري تعتيم الصورة...*\n⏳ يرجى الانتظار'
        }, { quoted: message });

        // تغيير حجم الصورة وتحسينها
        const resizedImage = await sharp(imageBuffer)
            .resize(800, 800, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 80 })
            .toBuffer();

        // تطبيق تأثير التعتيم
        const blurredImage = await sharp(resizedImage)
            .blur(10)
            .toBuffer();

        // حذف رسالة "جاري التعتيم"
        await sock.sendMessage(chatId, { delete: processingMsg.key });

        // إرسال الصورة المعتمة
        await sock.sendMessage(chatId, {
            image: blurredImage,
            caption: `╭━━━≪•🎨 *تـعـتـيـم الـصـورة* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃✅ *تم تعتيم الصورة بنجاح!*
┃━━━━━━━━━━━━━━━━━━━━━
┃🎯 *مستوى التعتيم:* قوي
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`,
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
        console.error('خطأ في تعتيم الصورة:', error);
        
        let errorMessage = '❌ *فشل تعتيم الصورة!*\n⚠️ يرجى المحاولة لاحقاً.';
        
        if (error.message && error.message.includes('sharp')) {
            errorMessage = '❌ *خطأ في معالجة الصورة!*\n⚠️ تأكد من أن الملف صورة صالحة.';
        } else if (error.message && error.message.includes('large')) {
            errorMessage = '❌ *الصورة كبيرة جداً!*\n⚠️ يرجى استخدام صورة بحجم أقل من 5 ميجابايت.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
    }
}

module.exports = blurCommand;