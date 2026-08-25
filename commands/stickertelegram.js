const fetch = require('node-fetch');
const { writeExifImg } = require('../lib/exif');
const delay = time => new Promise(res => setTimeout(res, time));
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const webp = require('node-webpmux');
const crypto = require('crypto');
const { exec } = require('child_process');
const settings = require('../settings');

const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function stickerTelegramCommand(sock, chatId, msg) {
    try {
        const text = msg.message?.conversation?.trim() || 
                    msg.message?.extendedTextMessage?.text?.trim() || '';
        
        const args = text.split(' ').slice(1);
        
        if (!args[0]) {
            await sock.sendMessage(chatId, { 
                text: '🎨 *أمر تحميل ملصقات تيليجرام - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.ملصق تيليجرام <رابط الحزمة>`\n\n📝 *مثال:*\n`.ملصق تيليجرام https://t.me/addstickers/Porcientoreal`\n`.ملصق تيليجرام https://t.me/addstickers/StickersName`\n\n✨ *سيتم تحميل جميع ملصقات الحزمة وتحويلها إلى واتساب*'
            });
            return;
        }

        // التحقق من صحة الرابط
        if (!args[0].match(/(https:\/\/t.me\/addstickers\/)/gi)) {
            await sock.sendMessage(chatId, { 
                text: '❌ *رابط غير صالح!*\n📌 تأكد من أن الرابط من تيليجرام ويبدأ بـ https://t.me/addstickers/'
            });
            return;
        }

        // إظهار تفاعل "جاري التحميل"
        await sock.sendMessage(chatId, {
            react: { text: '🎨', key: msg.key }
        });

        // استخراج اسم الحزمة من الرابط
        const packName = args[0].replace("https://t.me/addstickers/", "");

        const botToken = '7801479976:AAGuPL0a7kXXBYz6XUSR_ll2SR5V_W6oHl4';
        
        try {
            // جلب معلومات حزمة الملصقات
            const response = await fetch(
                `https://api.telegram.org/bot${botToken}/getStickerSet?name=${encodeURIComponent(packName)}`,
                { 
                    method: "GET",
                    headers: {
                        "Accept": "application/json",
                        "User-Agent": "Mozilla/5.0"
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const stickerSet = await response.json();
            
            if (!stickerSet.ok || !stickerSet.result) {
                throw new Error('حزمة ملصقات غير صالحة');
            }

            const stickerCount = stickerSet.result.stickers.length;
            const packTitle = stickerSet.result.title || packName;

            // إرسال رسالة بعدد الملصقات
            const infoMsg = await sock.sendMessage(chatId, { 
                text: `📦 *حزمة:* ${packTitle}\n🎨 *عدد الملصقات:* ${stickerCount}\n⏳ *جاري التحميل...*` 
            });

            let successCount = 0;
            for (let i = 0; i < stickerSet.result.stickers.length; i++) {
                try {
                    const sticker = stickerSet.result.stickers[i];
                    const fileId = sticker.file_id;
                    
                    // الحصول على مسار الملف
                    const fileInfo = await fetch(
                        `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
                    );
                    
                    if (!fileInfo.ok) continue;
                    
                    const fileData = await fileInfo.json();
                    if (!fileData.ok || !fileData.result.file_path) continue;

                    // تحميل الملصق
                    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
                    const imageResponse = await fetch(fileUrl);
                    const imageBuffer = await imageResponse.buffer();

                    const tempInput = path.join(TEMP_DIR, `temp_${Date.now()}_${i}`);
                    const tempOutput = path.join(TEMP_DIR, `sticker_${Date.now()}_${i}.webp`);

                    fs.writeFileSync(tempInput, imageBuffer);

                    const isAnimated = sticker.is_animated || sticker.is_video;
                    
                    // تحويل إلى WebP
                    const ffmpegCommand = isAnimated
                        ? `ffmpeg -i "${tempInput}" -t 5 -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=12,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 65 -compression_level 6 -b:v 150k "${tempOutput}"`
                        : `ffmpeg -i "${tempInput}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${tempOutput}"`;

                    await new Promise((resolve, reject) => {
                        exec(ffmpegCommand, (error) => {
                            if (error) reject(error);
                            else resolve();
                        });
                    });

                    const webpBuffer = fs.readFileSync(tempOutput);

                    // إضافة بيانات تعريفية
                    const img = new webp.Image();
                    await img.load(webpBuffer);

                    const metadata = {
                        'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
                        'sticker-pack-name': settings.packname || 'JAWAD.BOT',
                        'sticker-pack-publisher': settings.author || 'DarkXecutor',
                        'emojis': sticker.emoji ? [sticker.emoji] : ['🎨', '🤖']
                    };

                    const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
                    const jsonBuffer = Buffer.from(JSON.stringify(metadata), 'utf8');
                    const exif = Buffer.concat([exifAttr, jsonBuffer]);
                    exif.writeUIntLE(jsonBuffer.length, 14, 4);

                    img.exif = exif;
                    const finalBuffer = await img.save(null);

                    // إرسال الملصق
                    await sock.sendMessage(chatId, { 
                        sticker: finalBuffer 
                    });

                    successCount++;
                    await delay(800);

                    // تنظيف الملفات المؤقتة
                    try {
                        fs.unlinkSync(tempInput);
                        fs.unlinkSync(tempOutput);
                    } catch(err) {}

                } catch (err) {
                    console.error(`خطأ في معالجة الملصق ${i}:`, err);
                    continue;
                }
            }

            // حذف رسالة المعلومات
            await sock.sendMessage(chatId, { delete: infoMsg.key });

            // إرسال رسالة الإكمال
            const resultMessage = `╭━━━≪•🎨 *تـحـمـيـل مـلـصـقـات تـيـلـيـجـرام* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃✅ *تم التحميل بنجاح!*
┃━━━━━━━━━━━━━━━━━━━━━
┃📦 *الحزمة:* ${packTitle}
┃🎨 *تم تحميل:* ${successCount}/${stickerCount} ملصق
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

            await sock.sendMessage(chatId, { text: resultMessage });

            // إظهار تفاعل النجاح
            await sock.sendMessage(chatId, {
                react: { text: '✅', key: msg.key }
            });

        } catch (error) {
            throw new Error(`فشل معالجة حزمة الملصقات: ${error.message}`);
        }

    } catch (error) {
        console.error('خطأ في أمر ملصقات تيليجرام:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ *فشل تحميل ملصقات تيليجرام!*\n\n📌 *تأكد من:*\n• الرابط صحيح\n• الحزمة موجودة\n• الحزمة عامة'
        });
    }
}

module.exports = stickerTelegramCommand;