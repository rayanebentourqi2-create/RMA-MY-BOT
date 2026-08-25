const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { UploadFileUgu, TelegraPh } = require('../lib/uploader');

async function getMediaBufferAndExt(message) {
    const m = message.message || {};
    if (m.imageMessage) {
        const stream = await downloadContentFromMessage(m.imageMessage, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.jpg', type: 'صورة' };
    }
    if (m.videoMessage) {
        const stream = await downloadContentFromMessage(m.videoMessage, 'video');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.mp4', type: 'فيديو' };
    }
    if (m.audioMessage) {
        const stream = await downloadContentFromMessage(m.audioMessage, 'audio');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.mp3', type: 'صوت' };
    }
    if (m.documentMessage) {
        const stream = await downloadContentFromMessage(m.documentMessage, 'document');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const fileName = m.documentMessage.fileName || 'file.bin';
        const ext = path.extname(fileName) || '.bin';
        return { buffer: Buffer.concat(chunks), ext, type: 'ملف' };
    }
    if (m.stickerMessage) {
        const stream = await downloadContentFromMessage(m.stickerMessage, 'sticker');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.webp', type: 'ملصق' };
    }
    return null;
}

async function getQuotedMediaBufferAndExt(message) {
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
    if (!quoted) return null;
    return getMediaBufferAndExt({ message: quoted });
}

async function urlCommand(sock, chatId, message) {
    try {
        // إظهار تفاعل "جاري المعالجة"
        await sock.sendMessage(chatId, {
            react: { text: '📤', key: message.key }
        });

        // البحث عن الوسائط في الرسالة الحالية أو المقتبسة
        let media = await getMediaBufferAndExt(message);
        if (!media) media = await getQuotedMediaBufferAndExt(message);

        if (!media) {
            await sock.sendMessage(chatId, { 
                text: '🔗 *أمر تحويل الوسائط إلى رابط - JAWAD.BOT*\n\n📌 *الاستخدام:*\nأرسل أو قم بالرد على وسائط (صورة، فيديو، صوت، ملف، ملصق) وأرسل `.رابط`\n\n📝 *مثال:*\n1️⃣ أرسل صورة\n2️⃣ قم بالرد عليها بـ `.رابط`\n3️⃣ ستحصل على رابط مباشر للتحميل\n\n✨ *الوسائط المدعومة:*\n• صور 📸\n• فيديوهات 🎥\n• صوت 🎵\n• ملفات 📄\n• ملصقات 🖼️'
            }, { quoted: message });
            return;
        }

        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const tempPath = path.join(tempDir, `${Date.now()}${media.ext}`);
        fs.writeFileSync(tempPath, media.buffer);

        // إرسال رسالة "جاري الرفع"
        const processingMsg = await sock.sendMessage(chatId, { 
            text: `📤 *جاري رفع ${media.type}...*\n⏳ يرجى الانتظار`
        }, { quoted: message });

        let url = '';
        try {
            if (media.ext === '.jpg' || media.ext === '.png' || media.ext === '.webp') {
                try {
                    url = await TelegraPh(tempPath);
                } catch {
                    const res = await UploadFileUgu(tempPath);
                    url = typeof res === 'string' ? res : (res.url || res.url_full || JSON.stringify(res));
                }
            } else {
                const res = await UploadFileUgu(tempPath);
                url = typeof res === 'string' ? res : (res.url || res.url_full || JSON.stringify(res));
            }
        } finally {
            setTimeout(() => {
                try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch(e) {}
            }, 2000);
        }

        // حذف رسالة "جاري الرفع"
        await sock.sendMessage(chatId, { delete: processingMsg.key });

        if (!url) {
            await sock.sendMessage(chatId, { 
                text: '❌ *فشل الرفع!*\n⚠️ تعذر رفع الوسائط. يرجى المحاولة لاحقاً.'
            }, { quoted: message });
            return;
        }

        // إرسال الرابط
        const resultMessage = `🔗 *رابط ${media.type} - JAWAD.BOT*\n\n📎 *الرابط:*\n${url}\n\n━━━━━━━━━━━━━━━━━━━━━\n📌 *يمكنك استخدام هذا الرابط للتحميل أو المشاركة*\n> 🤖 *JAWAD.BOT*`;

        await sock.sendMessage(chatId, { 
            text: resultMessage
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('[رابط] خطأ:', error?.message || error);
        
        let errorMessage = '❌ *حدث خطأ!*\n⚠️ تعذر تحويل الوسائط إلى رابط.\n\n📌 *نصيحة:* تأكد من أن الملف ليس كبيراً جداً (أقل من 5 ميجابايت)';
        
        if (error.message && error.message.includes('too large')) {
            errorMessage = '❌ *الملف كبير جداً!*\n⚠️ الحد الأقصى للحجم هو 5 ميجابايت.\n\n📌 *نصيحة:* جرب بملف أصغر حجماً.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
    }
}

module.exports = urlCommand;