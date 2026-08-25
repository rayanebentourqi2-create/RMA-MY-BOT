const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// المجلد المؤقت
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// دالة التحقق من الصلاحيات
async function ensureGroupAndAdmin(sock, chatId, senderId, message) {
    const isGroup = chatId.endsWith('@g.us');
    if (!isGroup) {
        await sock.sendMessage(chatId, { 
            text: '⚠️ هذا الأمر يمكن استخدامه فقط في المجموعات.' 
        }, { quoted: message });
        return { ok: false };
    }
    
    const isAdmin = require('../lib/isAdmin');
    const adminStatus = await isAdmin(sock, chatId, senderId);
    
    if (!adminStatus.isBotAdmin) {
        await sock.sendMessage(chatId, { 
            text: '⚠️ *الرجاء جعل البوت مشرفاً أولاً!*' 
        }, { quoted: message });
        return { ok: false };
    }
    
    if (!adminStatus.isSenderAdmin && !message.key.fromMe) {
        await sock.sendMessage(chatId, { 
            text: '⛔ *غير مصرح!*\n👑 فقط مشرفي المجموعة يمكنهم استخدام هذا الأمر.' 
        }, { quoted: message });
        return { ok: false };
    }
    return { ok: true };
}

// ===================== تغيير وصف المجموعة =====================
async function setGroupDescription(sock, chatId, senderId, text, message) {
    try {
        const check = await ensureGroupAndAdmin(sock, chatId, senderId, message);
        if (!check.ok) return;
        
        const desc = (text || '').trim();
        if (!desc) {
            await sock.sendMessage(chatId, { 
                text: '📝 *تغيير وصف المجموعة*\n\n📌 *الاستخدام:*\n`.وصف المجموعة <النص الجديد>`\n\n📝 *مثال:*\n`.وصف المجموعة مرحباً بكم في مجموعتنا`' 
            }, { quoted: message });
            return;
        }
        
        // إظهار تفاعل "جاري التحديث"
        await sock.sendMessage(chatId, {
            react: { text: '📝', key: message.key }
        });
        
        await sock.groupUpdateDescription(chatId, desc);
        
        await sock.sendMessage(chatId, { 
            text: `✅ *تم تحديث وصف المجموعة بنجاح!*\n\n📝 *الوصف الجديد:*\n${desc}` 
        }, { quoted: message });
        
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });
        
    } catch (e) {
        console.error('خطأ في تحديث وصف المجموعة:', e);
        await sock.sendMessage(chatId, { 
            text: '❌ *فشل تحديث وصف المجموعة!*\n⚠️ تأكد من أن البوت مشرف ولديه الصلاحيات الكافية.' 
        }, { quoted: message });
    }
}

// ===================== تغيير اسم المجموعة =====================
async function setGroupName(sock, chatId, senderId, text, message) {
    try {
        const check = await ensureGroupAndAdmin(sock, chatId, senderId, message);
        if (!check.ok) return;
        
        const name = (text || '').trim();
        if (!name) {
            await sock.sendMessage(chatId, { 
                text: '📛 *تغيير اسم المجموعة*\n\n📌 *الاستخدام:*\n`.اسم المجموعة <الاسم الجديد>`\n\n📝 *مثال:*\n`.اسم المجموعة JAWAD.BOT Official`' 
            }, { quoted: message });
            return;
        }
        
        // إظهار تفاعل "جاري التحديث"
        await sock.sendMessage(chatId, {
            react: { text: '📛', key: message.key }
        });
        
        await sock.groupUpdateSubject(chatId, name);
        
        await sock.sendMessage(chatId, { 
            text: `✅ *تم تحديث اسم المجموعة بنجاح!*\n\n📛 *الاسم الجديد:* ${name}` 
        }, { quoted: message });
        
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });
        
    } catch (e) {
        console.error('خطأ في تحديث اسم المجموعة:', e);
        await sock.sendMessage(chatId, { 
            text: '❌ *فشل تحديث اسم المجموعة!*\n⚠️ تأكد من أن البوت مشرف ولديه الصلاحيات الكافية.' 
        }, { quoted: message });
    }
}

// ===================== تغيير صورة المجموعة =====================
async function setGroupPhoto(sock, chatId, senderId, message) {
    try {
        const check = await ensureGroupAndAdmin(sock, chatId, senderId, message);
        if (!check.ok) return;

        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const imageMessage = quoted?.imageMessage || quoted?.stickerMessage;
        
        if (!imageMessage) {
            await sock.sendMessage(chatId, { 
                text: '🖼️ *تغيير صورة المجموعة*\n\n📌 *الاستخدام:*\nقم بالرد على صورة أو ملصق وأرسل:\n`.صورة المجموعة`\n\n📝 *مثال:*\n1️⃣ أرسل صورة\n2️⃣ رد على الصورة بـ `.صورة المجموعة`' 
            }, { quoted: message });
            return;
        }
        
        // إظهار تفاعل "جاري التحديث"
        await sock.sendMessage(chatId, {
            react: { text: '🖼️', key: message.key }
        });
        
        // تحميل الصورة
        const stream = await downloadContentFromMessage(imageMessage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        const imgPath = path.join(TEMP_DIR, `gpp_${Date.now()}.jpg`);
        fs.writeFileSync(imgPath, buffer);

        // تحديث صورة المجموعة
        await sock.updateProfilePicture(chatId, { url: imgPath });
        
        // تنظيف الملف المؤقت
        try { fs.unlinkSync(imgPath); } catch(e) {}
        
        await sock.sendMessage(chatId, { 
            text: '✅ *تم تحديث صورة المجموعة بنجاح!*' 
        }, { quoted: message });
        
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });
        
    } catch (e) {
        console.error('خطأ في تحديث صورة المجموعة:', e);
        
        let errorMessage = '❌ *فشل تحديث صورة المجموعة!*\n⚠️ تأكد من:\n• البوت مشرف في المجموعة\n• الصورة بصيغة صالحة (JPEG/PNG)\n• حجم الصورة مناسب (أقل من 5 ميجابايت)';
        
        if (e.message && e.message.includes('image')) {
            errorMessage = '❌ *صيغة غير مدعومة!*\n⚠️ يرجى استخدام صورة بصيغة JPEG أو PNG.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage 
        }, { quoted: message });
    }
}

module.exports = {
    setGroupDescription,
    setGroupName,
    setGroupPhoto
};