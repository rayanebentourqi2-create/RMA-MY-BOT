const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const settings = require('../settings');
const webp = require('node-webpmux');
const crypto = require('crypto');

const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function stickercropCommand(sock, chatId, message) {
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

    const mediaMessage = targetMessage.message?.imageMessage || targetMessage.message?.videoMessage || targetMessage.message?.documentMessage || targetMessage.message?.stickerMessage;

    if (!mediaMessage) {
        await sock.sendMessage(chatId, { 
            text: '✂️ *أمر قص الصور إلى ملصق مربع - JAWAD.BOT*\n\n📌 *الاستخدام:*\nقم بالرد على صورة/فيديو/ملصق وأرسل:\n`.قص`\n\n📝 *مثال:*\n1️⃣ أرسل صورة\n2️⃣ رد على الصورة بـ `.قص`\n3️⃣ سيتم قص الصورة وتحويلها إلى ملصق مربع 512×512\n\n✨ *يدعم قص الصور والفيديوهات والملصقات*',
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
        // إظهار تفاعل "جاري القص"
        await sock.sendMessage(chatId, {
            react: { text: '✂️', key: message.key }
        });

        // إرسال رسالة "جاري المعالجة"
        const processingMsg = await sock.sendMessage(chatId, { 
            text: '✂️ *جاري قص الوسائط وتحويلها إلى ملصق مربع...*\n⏳ يرجى الانتظار'
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

        const tempInput = path.join(TEMP_DIR, `temp_${Date.now()}`);
        const tempOutput = path.join(TEMP_DIR, `crop_${Date.now()}.webp`);

        fs.writeFileSync(tempInput, mediaBuffer);

        const isAnimated = mediaMessage.mimetype?.includes('gif') || 
                          mediaMessage.mimetype?.includes('video') || 
                          (mediaMessage.seconds || 0) > 0;

        const fileSizeKB = mediaBuffer.length / 1024;
        const isLargeFile = fileSizeKB > 5000;

        let ffmpegCommand;
        
        if (isAnimated) {
            if (isLargeFile) {
                ffmpegCommand = `ffmpeg -i "${tempInput}" -t 2 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=8" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 30 -compression_level 6 -b:v 100k -max_muxing_queue_size 1024 "${tempOutput}"`;
            } else {
                ffmpegCommand = `ffmpeg -i "${tempInput}" -t 3 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=12" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 50 -compression_level 6 -b:v 150k -max_muxing_queue_size 1024 "${tempOutput}"`;
            }
        } else {
            ffmpegCommand = `ffmpeg -i "${tempInput}" -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,format=rgba" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${tempOutput}"`;
        }

        await new Promise((resolve, reject) => {
            exec(ffmpegCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error('خطأ في FFmpeg:', error);
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        if (!fs.existsSync(tempOutput)) {
            throw new Error('FFmpeg فشل في إنشاء ملف الإخراج');
        }

        let webpBuffer = fs.readFileSync(tempOutput);
        const finalSizeKB = webpBuffer.length / 1024;
        console.log(`حجم الملصق النهائي: ${Math.round(finalSizeKB)} كيلوبايت`);

        // إضافة بيانات تعريفية
        const img = new webp.Image();
        await img.load(webpBuffer);

        const json = {
            'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
            'sticker-pack-name': settings.packname || 'JAWAD.BOT',
            'sticker-pack-publisher': settings.author || 'DarkXecutor',
            'emojis': ['✂️', '📐']
        };

        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
        const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
        const exif = Buffer.concat([exifAttr, jsonBuffer]);
        exif.writeUIntLE(jsonBuffer.length, 14, 4);

        img.exif = exif;
        const finalBuffer = await img.save(null);

        // حذف رسالة "جاري المعالجة"
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
        console.error('خطأ في أمر قص الملصق:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ *فشل قص الوسائط!*\n⚠️ حاول باستخدام صورة أو فيديو أصغر حجماً.',
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

module.exports = stickercropCommand;

// دالة مساعدة: تحويل وسائط خام إلى ملصق مقصوص
async function stickercropFromBuffer(inputBuffer, isAnimated) {
    const tempInput = path.join(TEMP_DIR, `cropbuf_${Date.now()}`);
    const tempOutput = path.join(TEMP_DIR, `cropbuf_out_${Date.now()}.webp`);

    fs.writeFileSync(tempInput, inputBuffer);

    const fileSizeKB = inputBuffer.length / 1024;
    const isLargeFile = fileSizeKB > 5000;

    let ffmpegCommand;
    if (isAnimated) {
        if (isLargeFile) {
            ffmpegCommand = `ffmpeg -y -i "${tempInput}" -t 2 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=8" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 30 -compression_level 6 -b:v 100k -max_muxing_queue_size 1024 "${tempOutput}"`;
        } else {
            ffmpegCommand = `ffmpeg -y -i "${tempInput}" -t 3 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=12" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 50 -compression_level 6 -b:v 150k -max_muxing_queue_size 1024 "${tempOutput}"`;
        }
    } else {
        ffmpegCommand = `ffmpeg -y -i "${tempInput}" -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,format=rgba" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${tempOutput}"`;
    }

    await new Promise((resolve, reject) => {
        exec(ffmpegCommand, (error) => {
            if (error) return reject(error);
            resolve();
        });
    });

    const webpBuffer = fs.readFileSync(tempOutput);

    const img = new webp.Image();
    await img.load(webpBuffer);
    const json = {
        'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
        'sticker-pack-name': settings.packname || 'JAWAD.BOT',
        'sticker-pack-publisher': settings.author || 'DarkXecutor',
        'emojis': ['✂️']
    };
    const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
    const exif = Buffer.concat([exifAttr, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);
    img.exif = exif;
    const finalBuffer = await img.save(null);

    try {
        fs.unlinkSync(tempInput);
        fs.unlinkSync(tempOutput);
    } catch(e) {}

    return finalBuffer;
}

module.exports.stickercropFromBuffer = stickercropFromBuffer;