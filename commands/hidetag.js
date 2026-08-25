const isAdmin = require('../lib/isAdmin');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '../temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function downloadMediaMessage(message, mediaType) {
    const stream = await downloadContentFromMessage(message, mediaType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    const filePath = path.join(TEMP_DIR, `${Date.now()}.${mediaType}`);
    fs.writeFileSync(filePath, buffer);
    return filePath;
}

async function hideTagCommand(sock, chatId, senderId, messageText, replyMessage, message) {
    try {
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ *الرجاء جعل البوت مشرفاً أولاً!*' 
            }, { quoted: message });
            return;
        }

        if (!isSenderAdmin && !message.key.fromMe) {
            await sock.sendMessage(chatId, { 
                text: '⛔ *غير مصرح!*\n👑 فقط مشرفي المجموعة يمكنهم استخدام أمر المنشن المخفي.' 
            }, { quoted: message });
            return;
        }

        // إظهار تفاعل "جاري المعالجة"
        await sock.sendMessage(chatId, {
            react: { text: '🔇', key: message.key }
        });

        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants || [];
        const groupName = groupMetadata.subject;
        
        // الحصول على جميع الأعضاء (للمنشن المخفي)
        const allMembers = participants.map(p => p.id);
        
        // نص الرسالة الافتراضي
        const defaultText = `╭━━━≪•🔇 *مـنـشـن مـخـفـي* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃📢 *تنبيه من المشرفين*
┃━━━━━━━━━━━━━━━━━━━━━
┃${messageText || 'يرجى الانتباه إلى الرسالة المرفقة'}
┃━━━━━━━━━━━━━━━━━━━━━
┃👥 *المجموعة:* ${groupName}
┃👑 *تم الإرسال بواسطة:* @${senderId.split('@')[0]}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        if (replyMessage) {
            let content = {};
            
            if (replyMessage.imageMessage) {
                const filePath = await downloadMediaMessage(replyMessage.imageMessage, 'image');
                content = { 
                    image: { url: filePath }, 
                    caption: messageText || replyMessage.imageMessage.caption || defaultText, 
                    mentions: allMembers 
                };
                // تنظيف الملف المؤقت بعد الإرسال (سيتم تنظيفه تلقائياً لاحقاً)
                setTimeout(() => {
                    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch(e) {}
                }, 5000);
                
            } else if (replyMessage.videoMessage) {
                const filePath = await downloadMediaMessage(replyMessage.videoMessage, 'video');
                content = { 
                    video: { url: filePath }, 
                    caption: messageText || replyMessage.videoMessage.caption || defaultText, 
                    mentions: allMembers 
                };
                setTimeout(() => {
                    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch(e) {}
                }, 5000);
                
            } else if (replyMessage.conversation || replyMessage.extendedTextMessage) {
                const originalText = replyMessage.conversation || replyMessage.extendedTextMessage?.text || '';
                content = { 
                    text: `╭━━━≪•🔇 *مـنـشـن مـخـفـي* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃💬 *الرسالة الأصلية:* 
┃${originalText}
┃━━━━━━━━━━━━━━━━━━━━━
┃📝 ${messageText || 'يرجى الانتباه'}
┃━━━━━━━━━━━━━━━━━━━━━
┃👥 *المجموعة:* ${groupName}
┃👑 *تم الإرسال بواسطة:* @${senderId.split('@')[0]}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`,
                    mentions: allMembers 
                };
                
            } else if (replyMessage.documentMessage) {
                const filePath = await downloadMediaMessage(replyMessage.documentMessage, 'document');
                content = { 
                    document: { url: filePath }, 
                    fileName: replyMessage.documentMessage.fileName, 
                    caption: messageText || defaultText, 
                    mentions: allMembers 
                };
                setTimeout(() => {
                    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch(e) {}
                }, 5000);
            }

            if (Object.keys(content).length > 0) {
                await sock.sendMessage(chatId, content);
            }
        } else {
            await sock.sendMessage(chatId, { 
                text: defaultText, 
                mentions: allMembers 
            });
        }

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر المنشن المخفي:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ *حدث خطأ!*\n⚠️ تعذر إرسال المنشن المخفي. يرجى المحاولة لاحقاً.' 
        }, { quoted: message });
    }
}

module.exports = hideTagCommand;