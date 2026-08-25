const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const webp = require('node-webpmux');
const crypto = require('crypto');

async function takeCommand(sock, chatId, message, args) {
    try {
        // التحقق من أن المستخدم رد على ملصق
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMessage?.stickerMessage) {
            await sock.sendMessage(chatId, { 
                text: '❌ *خطأ!*\n\n📌 قم بالرد على ملصق وأضف الأمر:\n`.خذ <اسم الحزمة>`\n\n📝 *مثال:*\n`.خذ JAWAD.BOT`\n\n✨ *سيتم تعديل الملصق وإعادة إرساله بالاسم الجديد*'
            }, { quoted: message });
            return;
        }

        // الحصول على اسم الحزمة من المعاملات أو استخدام الافتراضي
        const packname = args.join(' ') || 'JAWAD.BOT';
        const author = 'JAWAD.BOT';

        // إظهار تفاعل "جاري المعالجة"
        await sock.sendMessage(chatId, {
            react: { text: '🔄', key: message.key }
        });

        // إرسال رسالة "جاري التعديل"
        const processingMsg = await sock.sendMessage(chatId, { 
            text: '🔄 *جاري تعديل الملصق...*\n📦 اسم الحزمة: ' + packname + '\n⏳ يرجى الانتظار'
        }, { quoted: message });

        try {
            // تحميل الملصق
            const stickerBuffer = await downloadMediaMessage(
                {
                    key: message.message.extendedTextMessage.contextInfo.stanzaId,
                    message: quotedMessage,
                    messageType: 'stickerMessage'
                },
                'buffer',
                {},
                {
                    logger: console,
                    reuploadRequest: sock.updateMediaMessage
                }
            );

            if (!stickerBuffer) {
                await sock.sendMessage(chatId, { delete: processingMsg.key });
                await sock.sendMessage(chatId, { 
                    text: '❌ *فشل التحميل!*\n⚠️ تعذر تحميل الملصق. يرجى المحاولة مرة أخرى.'
                }, { quoted: message });
                return;
            }

            // إضافة بيانات التعريف باستخدام webpmux
            const img = new webp.Image();
            await img.load(stickerBuffer);

            // إنشاء بيانات التعريف
            const json = {
                'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
                'sticker-pack-name': packname,
                'sticker-pack-publisher': author,
                'emojis': ['🤖', '✨', '💙']
            };

            // إنشاء exif buffer
            const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
            const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
            const exif = Buffer.concat([exifAttr, jsonBuffer]);
            exif.writeUIntLE(jsonBuffer.length, 14, 4);

            // تعيين بيانات exif
            img.exif = exif;

            // الحصول على الملف النهائي مع البيانات المضاف
            const finalBuffer = await img.save(null);

            // حذف رسالة "جاري التعديل"
            await sock.sendMessage(chatId, { delete: processingMsg.key });

            // إرسال الملصق المعدل
            await sock.sendMessage(chatId, {
                sticker: finalBuffer
            }, { quoted: message });

            // إظهار تفاعل النجاح
            await sock.sendMessage(chatId, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('خطأ في معالجة الملصق:', error);
            await sock.sendMessage(chatId, { delete: processingMsg.key });
            
            let errorMessage = '❌ *حدث خطأ أثناء معالجة الملصق!*\n⚠️ يرجى التأكد من أن الملف هو ملصق صحيح.';
            
            if (error.message && error.message.includes('corrupted')) {
                errorMessage = '❌ *الملصق تالف!*\n⚠️ هذا الملصق قد يكون تالفاً أو غير مدعوم.';
            }
            
            await sock.sendMessage(chatId, { 
                text: errorMessage
            }, { quoted: message });
        }

    } catch (error) {
        console.error('خطأ في أمر take:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ *حدث خطأ!*\n⚠️ تعذر معالجة الأمر. يرجى المحاولة لاحقاً.'
        }, { quoted: message });
    }
}

module.exports = takeCommand;