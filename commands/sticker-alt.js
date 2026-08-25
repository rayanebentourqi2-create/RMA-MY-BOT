const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const execPromise = promisify(exec);

const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function stickerCommand(sock, chatId, message) {
    try {
        const quotedMsg = message.message.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMsg) {
            await sock.sendMessage(chatId, { 
                text: '🎨 *أمر تحويل الصور إلى ملصقات - JAWAD.BOT*\n\n📌 *الاستخدام:*\nقم بالرد على صورة أو فيديو وأرسل:\n`.ملصق`\n\n📝 *مثال:*\n1️⃣ أرسل صورة\n2️⃣ رد على الصورة بـ `.ملصق`\n3️⃣ سيتم تحويلها إلى ملصق (ستيكر)\n\n✨ *يدعم تحويل الصور والفيديوهات القصيرة*'
            }, { quoted: message });
            return;
        }

        const type = Object.keys(quotedMsg)[0];
        if (!['imageMessage', 'videoMessage'].includes(type)) {
            await sock.sendMessage(chatId, { 
                text: '❌ *خطأ!*\n⚠️ الرجاء الرد على صورة أو فيديو لتحويله إلى ملصق.' 
            }, { quoted: message });
            return;
        }

        // إظهار تفاعل "جاري التحويل"
        await sock.sendMessage(chatId, {
            react: { text: '🖼️', key: message.key }
        });

        // إرسال رسالة "جاري التحويل"
        const processingMsg = await sock.sendMessage(chatId, { 
            text: '🖼️ *جاري تحويل الوسائط إلى ملصق...*\n⏳ يرجى الانتظار'
        }, { quoted: message });

        const stream = await downloadContentFromMessage(quotedMsg[type], type.split('Message')[0]);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const ext = type === 'imageMessage' ? 'jpg' : 'mp4';
        const tempInput = path.join(TEMP_DIR, `temp_${Date.now()}.${ext}`);
        const tempOutput = path.join(TEMP_DIR, `sticker_${Date.now()}.webp`);

        fs.writeFileSync(tempInput, buffer);

        // تحويل إلى WebP باستخدام ffmpeg
        let cmd;
        if (type === 'imageMessage') {
            cmd = `ffmpeg -i "${tempInput}" -vf "scale='min(512,iw)':min'(512,ih)':force_original_aspect_ratio=decrease" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${tempOutput}"`;
        } else {
            // فيديو (أقصى مدة 6 ثوانٍ)
            cmd = `ffmpeg -i "${tempInput}" -t 6 -vf "scale='min(512,iw)':min'(512,ih)':force_original_aspect_ratio=decrease,fps=12" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 45 -compression_level 6 -b:v 150k "${tempOutput}"`;
        }
        
        await execPromise(cmd);

        // حذف رسالة "جاري التحويل"
        await sock.sendMessage(chatId, { delete: processingMsg.key });

        // إرسال الملصق
        await sock.sendMessage(chatId, { 
            sticker: fs.readFileSync(tempOutput) 
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

        // تنظيف الملفات المؤقتة
        try {
            fs.unlinkSync(tempInput);
            fs.unlinkSync(tempOutput);
        } catch(e) {}

    } catch (error) {
        console.error('خطأ في أمر تحويل الملصق:', error);
        
        let errorMessage = '❌ *فشل إنشاء الملصق!*\n';
        
        if (error.message && error.message.includes('ffmpeg')) {
            errorMessage += '⚠️ تأكد من تثبيت ffmpeg على الخادم.';
        } else if (error.message && error.message.includes('size')) {
            errorMessage += '⚠️ الملف كبير جداً. حاول بملف أصغر حجماً.';
        } else {
            errorMessage += '⚠️ يرجى المحاولة لاحقاً. تأكد من أن الملف صورة أو فيديو صالح.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
    }
}

module.exports = stickerCommand;