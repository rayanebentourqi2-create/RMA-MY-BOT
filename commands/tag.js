const isAdmin = require('../lib/isAdmin');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

// دالة تحميل الوسائط
async function downloadMediaMessage(message, mediaType) {
    const stream = await downloadContentFromMessage(message, mediaType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    const filePath = path.join(tempDir, `${Date.now()}.${mediaType}`);
    fs.writeFileSync(filePath, buffer);
    return filePath;
}

async function tagCommand(sock, chatId, senderId, messageText, replyMessage, message) {
    try {
        // التحقق من صلاحيات البوت والمستخدم
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ *الرجاء جعل البوت مشرفاً أولاً!*\n🔧 لا يمكن استخدام أمر المنشن دون صلاحيات المشرف.'
            }, { quoted: message });
            return;
        }

        if (!isSenderAdmin) {
            // إرسال ملصق تحذيري لغير المشرفين
            const stickerPath = path.join(__dirname, '../assets/14.jpg');
            if (fs.existsSync(stickerPath)) {
                const stickerBuffer = fs.readFileSync(stickerPath);
                await sock.sendMessage(chatId, { sticker: stickerBuffer }, { quoted: message });
            } else {
                await sock.sendMessage(chatId, { 
                    text: '⛔ *غير مصرح!*\n👑 فقط مشرفي المجموعة يمكنهم استخدام أمر المنشن.'
                }, { quoted: message });
            }
            return;
        }

        // إظهار تفاعل "جاري المعالجة"
        await sock.sendMessage(chatId, {
            react: { text: '📢', key: message.key }
        });

        // الحصول على معلومات المجموعة
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;
        const groupName = groupMetadata.subject;
        const mentionedJidList = participants.map(p => p.id);

        if (!participants || participants.length === 0) {
            await sock.sendMessage(chatId, { 
                text: '❌ *لا يوجد أعضاء!*\n⚠️ لم يتم العثور على أعضاء في هذه المجموعة.'
            }, { quoted: message });
            return;
        }

        // تنظيف الملفات المؤقتة بعد 10 ثوان
        setTimeout(() => {
            const tempDir = path.join(__dirname, '../temp');
            if (fs.existsSync(tempDir)) {
                const files = fs.readdirSync(tempDir);
                files.forEach(file => {
                    const filePath = path.join(tempDir, file);
                    try { fs.unlinkSync(filePath); } catch(e) {}
                });
            }
        }, 10000);

        if (replyMessage) {
            let messageContent = {};
            let captionText = messageText || '📢 *تنبيه للمجموعة*';

            // معالجة الصور
            if (replyMessage.imageMessage) {
                const filePath = await downloadMediaMessage(replyMessage.imageMessage, 'image');
                messageContent = {
                    image: { url: filePath },
                    caption: `${captionText}\n\n━━━━━━━━━━━━━━━━━━━━━\n👥 *المجموعة:* ${groupName}\n👑 *عدد الأعضاء:* ${participants.length}\n📢 *تم التنبيه بواسطة:* @${senderId.split('@')[0]}\n━━━━━━━━━━━━━━━━━━━━━\n> 🤖 *JAWAD.BOT*`,
                    mentions: [senderId, ...mentionedJidList]
                };
            }
            // معالجة الفيديوهات
            else if (replyMessage.videoMessage) {
                const filePath = await downloadMediaMessage(replyMessage.videoMessage, 'video');
                messageContent = {
                    video: { url: filePath },
                    caption: `${captionText}\n\n━━━━━━━━━━━━━━━━━━━━━\n👥 *المجموعة:* ${groupName}\n👑 *عدد الأعضاء:* ${participants.length}\n📢 *تم التنبيه بواسطة:* @${senderId.split('@')[0]}\n━━━━━━━━━━━━━━━━━━━━━\n> 🤖 *JAWAD.BOT*`,
                    mentions: [senderId, ...mentionedJidList]
                };
            }
            // معالجة الرسائل النصية
            else if (replyMessage.conversation || replyMessage.extendedTextMessage) {
                const originalText = replyMessage.conversation || replyMessage.extendedTextMessage?.text || '';
                messageContent = {
                    text: `╭━━━≪•📢 *مـنـشـن مـع ر سـالـة* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃💬 *الرسالة الأصلية:*
┃${originalText}
┃━━━━━━━━━━━━━━━━━━━━━
┃📝 *الرسالة الجديدة:* ${captionText}
┃━━━━━━━━━━━━━━━━━━━━━
┃👥 *المجموعة:* ${groupName}
┃👤 *عدد الأعضاء:* ${participants.length}
┃👤 *تم التنبيه بواسطة:* @${senderId.split('@')[0]}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`,
                    mentions: [senderId, ...mentionedJidList]
                };
            }
            // معالجة الملفات
            else if (replyMessage.documentMessage) {
                const filePath = await downloadMediaMessage(replyMessage.documentMessage, 'document');
                messageContent = {
                    document: { url: filePath },
                    fileName: replyMessage.documentMessage.fileName,
                    caption: `${captionText}\n\n━━━━━━━━━━━━━━━━━━━━━\n👥 *المجموعة:* ${groupName}\n👑 *عدد الأعضاء:* ${participants.length}\n📢 *تم التنبيه بواسطة:* @${senderId.split('@')[0]}\n━━━━━━━━━━━━━━━━━━━━━\n> 🤖 *JAWAD.BOT*`,
                    mentions: [senderId, ...mentionedJidList]
                };
            }

            if (Object.keys(messageContent).length > 0) {
                await sock.sendMessage(chatId, messageContent);
            }
        } else {
            // إرسال منشن بدون رد على رسالة
            const text = messageText || '📢 *تنبيه للمجموعة*';
            const formattedText = `╭━━━≪•📢 *مـنـشـن الـجـمـيـع* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃📝 ${text}
┃━━━━━━━━━━━━━━━━━━━━━
┃👥 *المجموعة:* ${groupName}
┃👤 *عدد الأعضاء:* ${participants.length}
┃👤 *تم التنبيه بواسطة:* @${senderId.split('@')[0]}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

            await sock.sendMessage(chatId, {
                text: formattedText,
                mentions: [senderId, ...mentionedJidList]
            });
        }

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر المنشن:', error);
        
        let errorMessage = '❌ *حدث خطأ!*\n⚠️ تعذر إرسال المنشن. يرجى المحاولة لاحقاً.';
        
        if (error.message && error.message.includes('rate')) {
            errorMessage = '⏳ *تم الوصول للحد الأقصى!*\n⚠️ يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
    }
}

module.exports = tagCommand;