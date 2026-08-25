const sharp = require('sharp');
const fs = require('fs');
const fsPromises = require('fs/promises');
const fse = require('fs-extra');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const scheduleFileDeletion = (filePath) => {
    setTimeout(async () => {
        try {
            await fse.remove(filePath);
            console.log(`تم حذف الملف: ${filePath}`);
        } catch (error) {
            console.error(`فشل حذف الملف:`, error);
        }
    }, 10000); // 10 ثواني
};

const convertStickerToImage = async (sock, quotedMessage, chatId, message) => {
    try {
        const stickerMessage = quotedMessage.stickerMessage;
        if (!stickerMessage) {
            await sock.sendMessage(chatId, { 
                text: '🖼️ *أمر تحويل الملصق إلى صورة - JAWAD.BOT*\n\n📌 *الاستخدام:*\nقم بالرد على ملصق وأرسل:\n`.صورة من ملصق`\n\n📝 *مثال:*\n1️⃣ أرسل ملصقاً\n2️⃣ رد على الملصق بـ `.صورة من ملصق`\n3️⃣ سيتم تحويل الملصق إلى صورة PNG'
            }, { quoted: message });
            return;
        }

        // إظهار تفاعل "جاري التحويل"
        await sock.sendMessage(chatId, {
            react: { text: '🖼️', key: message.key }
        });

        // إرسال رسالة "جاري التحويل"
        const processingMsg = await sock.sendMessage(chatId, { 
            text: '🖼️ *جاري تحويل الملصق إلى صورة...*\n⏳ يرجى الانتظار'
        }, { quoted: message });

        const stickerFilePath = path.join(tempDir, `sticker_${Date.now()}.webp`);
        const outputImagePath = path.join(tempDir, `converted_image_${Date.now()}.png`);

        const stream = await downloadContentFromMessage(stickerMessage, 'sticker');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        await fsPromises.writeFile(stickerFilePath, buffer);
        await sharp(stickerFilePath).toFormat('png').toFile(outputImagePath);

        const imageBuffer = await fsPromises.readFile(outputImagePath);

        // حذف رسالة "جاري التحويل"
        await sock.sendMessage(chatId, { delete: processingMsg.key });

        const caption = `╭━━━≪•🖼️ *تـحـويـل الـمـلـصـق* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃✅ *تم تحويل الملصق إلى صورة بنجاح!*
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        await sock.sendMessage(chatId, { 
            image: imageBuffer, 
            caption: caption 
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

        scheduleFileDeletion(stickerFilePath);
        scheduleFileDeletion(outputImagePath);
    } catch (error) {
        console.error('خطأ في تحويل الملصق إلى صورة:', error);
        
        let errorMessage = '❌ *فشل تحويل الملصق إلى صورة!*\n';
        
        if (error.message && error.message.includes('webp')) {
            errorMessage += '⚠️ تأكد من أن الملف هو ملصق بصيغة WebP صالحة.';
        } else {
            errorMessage += '⚠️ يرجى المحاولة لاحقاً.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
    }
};

module.exports = convertStickerToImage;