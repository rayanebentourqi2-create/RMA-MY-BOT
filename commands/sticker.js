const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const settings = require('../settings');
const webp = require('node-webpmux');
const crypto = require('crypto');

// المجلد المؤقت
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function stickerCommand(sock, chatId, message) {
    const messageToQuote = message;
    
    let targetMessage = message;

    if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quotedInfo = message.message.extendedTextMessage.contextInfo;
        targetMessage = {
            key: {
                remoteJid: chatId,
                id: quotedInfo.stanzaId,
                participant: quotedInfo.participant
            },
            message: quotedInfo.quotedMessage
        };
    }

    const mediaMessage = targetMessage.message?.imageMessage || targetMessage.message?.videoMessage || targetMessage.message?.documentMessage;

    if (!mediaMessage) {
        await sock.sendMessage(chatId, { 
            text: '🎨 *أمر تحويل الوسائط إلى ملصق - JAWAD.BOT*\n\n📌 *الاستخدام:*\nقم بالرد على صورة أو فيديو وأرسل:\n`.ملصق`\n\n📝 *مثال:*\n1️⃣ أرسل صورة أو فيديو\n2️⃣ رد على الوسائط بـ `.ملصق`\n3️⃣ سيتم تحويلها إلى ملصق (ستيكر)\n\n✨ *يدعم تحويل الصور والفيديوهات القصيرة*',
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363427092431731@newsletter',
                    newsletterName: 'JAWAD.BOT',
                    serverMessageId: -1
                }
            }
        }, { quoted: messageToQuote });
        return;
    }

    try {
        // إظهار تفاعل "جاري التحويل"
        await sock.sendMessage(chatId, {
            react: { text: '🎨', key: message.key }
        });

        // إرسال رسالة "جاري التحويل"
        const processingMsg = await sock.sendMessage(chatId, { 
            text: '🎨 *جاري تحويل الوسائط إلى ملصق...*\n⏳ يرجى الانتظار'
        }, { quoted: message });

        const mediaBuffer = await downloadMediaMessage(targetMessage, 'buffer', {}, { 
            logger: undefined, 
            reuploadRequest: sock.updateMediaMessage 
        });

        if (!mediaBuffer) {
            await sock.sendMessage(chatId, { delete: processingMsg.key });
            await sock.sendMessage(chatId, { 
                text: '❌ *فشل تحميل الوسائط!*\n⚠️ يرجى المحاولة مرة أخرى.',
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363427092431731@newsletter',
                        newsletterName: 'JAWAD.BOT',
                        serverMessageId: -1
                    }
                }
            });
            return;
        }

        // إنشاء مسارات الملفات المؤقتة
        const tempInput = path.join(TEMP_DIR, `temp_${Date.now()}`);
        const tempOutput = path.join(TEMP_DIR, `sticker_${Date.now()}.webp`);

        fs.writeFileSync(tempInput, mediaBuffer);

        const isAnimated = mediaMessage.mimetype?.includes('gif') || 
                          mediaMessage.mimetype?.includes('video') || 
                          (mediaMessage.seconds || 0) > 0;

        // تحويل إلى WebP باستخدام ffmpeg
        let ffmpegCommand;
        if (isAnimated) {
            ffmpegCommand = `ffmpeg -i "${tempInput}" -t 6 -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=12,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 45 -compression_level 6 -b:v 150k "${tempOutput}"`;
        } else {
            ffmpegCommand = `ffmpeg -i "${tempInput}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${tempOutput}"`;
        }

        await new Promise((resolve, reject) => {
            exec(ffmpegCommand, (error) => {
                if (error) {
                    console.error('خطأ في FFmpeg:', error);
                    reject(error);
                } else resolve();
            });
        });

        let webpBuffer = fs.readFileSync(tempOutput);

        // إذا كان الملف كبيراً جداً، إعادة ترميز بجودة أقل
        if (isAnimated && webpBuffer.length > 900 * 1024) {
            try {
                const tempOutput2 = path.join(TEMP_DIR, `sticker_fallback_${Date.now()}.webp`);
                const fileSizeKB = mediaBuffer.length / 1024;
                const isLargeFile = fileSizeKB > 5000;
                const fallbackCmd = isLargeFile
                    ? `ffmpeg -y -i "${tempInput}" -t 2 -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=8,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 30 -compression_level 6 -b:v 100k -max_muxing_queue_size 1024 "${tempOutput2}"`
                    : `ffmpeg -y -i "${tempInput}" -t 3 -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=12,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 45 -compression_level 6 -b:v 150k -max_muxing_queue_size 1024 "${tempOutput2}"`;
                await new Promise((resolve, reject) => {
                    exec(fallbackCmd, (error) => error ? reject(error) : resolve());
                });
                if (fs.existsSync(tempOutput2)) {
                    webpBuffer = fs.readFileSync(tempOutput2);
                    try { fs.unlinkSync(tempOutput2); } catch(e) {}
                }
            } catch(e) {}
        }

        // إضافة بيانات تعريفية (EXIF)
        const img = new webp.Image();
        await img.load(webpBuffer);

        const json = {
            'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
            'sticker-pack-name': settings.packname || 'JAWAD.BOT',
            'sticker-pack-publisher': settings.author || 'DarkXecutor',
            'emojis': ['🤖', '✨', '🎨']
        };

        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
        const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
        const exif = Buffer.concat([exifAttr, jsonBuffer]);
        exif.writeUIntLE(jsonBuffer.length, 14, 4);

        img.exif = exif;
        let finalBuffer = await img.save(null);

        // تقليل الحجم النهائي إذا كان كبيراً جداً
        if (isAnimated && finalBuffer.length > 900 * 1024) {
            try {
                const tempOutput3 = path.join(TEMP_DIR, `sticker_small_${Date.now()}.webp`);
                const smallCmd = `ffmpeg -y -i "${tempInput}" -t 2 -vf "scale=320:320:force_original_aspect_ratio=decrease,fps=8,pad=320:320:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 30 -compression_level 6 -b:v 80k -max_muxing_queue_size 1024 "${tempOutput3}"`;
                await new Promise((resolve, reject) => {
                    exec(smallCmd, (error) => error ? reject(error) : resolve());
                });
                if (fs.existsSync(tempOutput3)) {
                    const smallWebp = fs.readFileSync(tempOutput3);
                    const img2 = new webp.Image();
                    await img2.load(smallWebp);
                    const json2 = {
                        'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
                        'sticker-pack-name': settings.packname || 'JAWAD.BOT',
                        'sticker-pack-publisher': settings.author || 'DarkXecutor',
                        'emojis': ['🤖']
                    };
                    const exifAttr2 = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
                    const jsonBuffer2 = Buffer.from(JSON.stringify(json2), 'utf8');
                    const exif2 = Buffer.concat([exifAttr2, jsonBuffer2]);
                    exif2.writeUIntLE(jsonBuffer2.length, 14, 4);
                    img2.exif = exif2;
                    finalBuffer = await img2.save(null);
                    try { fs.unlinkSync(tempOutput3); } catch(e) {}
                }
            } catch(e) {}
        }

        // حذف رسالة "جاري التحويل"
        await sock.sendMessage(chatId, { delete: processingMsg.key });

        // إرسال الملصق
        await sock.sendMessage(chatId, { 
            sticker: finalBuffer
        }, { quoted: messageToQuote });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

        // تنظيف الملفات المؤقتة
        try {
            fs.unlinkSync(tempInput);
            fs.unlinkSync(tempOutput);
        } catch (err) {
            console.error('خطأ في تنظيف الملفات المؤقتة:', err);
        }

    } catch (error) {
        console.error('خطأ في أمر تحويل الملصق:', error);
        
        let errorMessage = '❌ *فشل إنشاء الملصق!*\n⚠️ يرجى المحاولة لاحقاً.';
        
        if (error.message && error.message.includes('ffmpeg')) {
            errorMessage = '❌ *خطأ في ffmpeg!*\n⚠️ تأكد من تثبيت ffmpeg على الخادم.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363427092431731@newsletter',
                    newsletterName: 'JAWAD.BOT',
                    serverMessageId: -1
                }
            }
        });
    }
}

module.exports = stickerCommand;