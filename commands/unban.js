const fs = require('fs');
const path = require('path');
const { channelInfo } = require('../lib/messageConfig');
const isAdmin = require('../lib/isAdmin');
const { isSudo } = require('../lib/index');

// تهيئة ملف المحظورين إذا لم يكن موجوداً
function initializeBannedFile() {
    const bannedPath = './data/banned.json';
    if (!fs.existsSync('./data')) {
        fs.mkdirSync('./data', { recursive: true });
    }
    if (!fs.existsSync(bannedPath)) {
        fs.writeFileSync(bannedPath, JSON.stringify([], null, 2));
    }
}

async function unbanCommand(sock, chatId, message) {
    try {
        initializeBannedFile();
        
        // التحقق من الصلاحيات حسب نوع المحادثة
        const isGroup = chatId.endsWith('@g.us');
        
        if (isGroup) {
            const senderId = message.key.participant || message.key.remoteJid;
            const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
            
            if (!isBotAdmin) {
                await sock.sendMessage(chatId, { 
                    text: '❌ *خطأ!*\n⚠️ الرجاء جعل البوت مشرفاً أولاً لاستخدام أمر إلغاء الحظر.', 
                    ...channelInfo 
                }, { quoted: message });
                return;
            }
            
            if (!isSenderAdmin && !message.key.fromMe) {
                await sock.sendMessage(chatId, { 
                    text: '⛔ *غير مصرح!*\n👑 فقط مشرفي المجموعة يمكنهم استخدام أمر إلغاء الحظر.', 
                    ...channelInfo 
                }, { quoted: message });
                return;
            }
        } else {
            const senderId = message.key.participant || message.key.remoteJid;
            const senderIsSudo = await isSudo(senderId);
            
            if (!message.key.fromMe && !senderIsSudo) {
                await sock.sendMessage(chatId, { 
                    text: '⛔ *غير مصرح!*\n🔒 فقط مطور البوت يمكنه استخدام أمر إلغاء الحظر في الخاص.', 
                    ...channelInfo 
                }, { quoted: message });
                return;
            }
        }
        
        // تحديد المستخدم المطلوب إلغاء حظره
        let userToUnban;
        
        // التحقق من وجود مستخدم مشار إليه
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            userToUnban = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        // التحقق من وجود رد على رسالة
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToUnban = message.message.extendedTextMessage.contextInfo.participant;
        }
        
        if (!userToUnban) {
            await sock.sendMessage(chatId, { 
                text: '🔓 *أمر إلغاء الحظر - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.الغاء حظر @مستخدم` أو قم بالرد على رسالة المستخدم\n\n📝 *مثال:*\n`.الغاء حظر @DarkXecutor`\n\n✨ *سيتم إلغاء حظر المستخدم ويمكنه استخدام البوت مرة أخرى*',
                ...channelInfo 
            }, { quoted: message });
            return;
        }
        
        // إظهار تفاعل "جاري المعالجة"
        await sock.sendMessage(chatId, {
            react: { text: '🔓', key: message.key }
        });
        
        // قراءة قائمة المحظورين
        const bannedUsers = JSON.parse(fs.readFileSync('./data/banned.json', 'utf8'));
        const userName = userToUnban.split('@')[0];
        
        const index = bannedUsers.indexOf(userToUnban);
        
        if (index > -1) {
            // إزالة المستخدم من قائمة المحظورين
            bannedUsers.splice(index, 1);
            fs.writeFileSync('./data/banned.json', JSON.stringify(bannedUsers, null, 2));
            
            const successMessage = `╭━━━≪•🔓 *إلغاء الحظر* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃✅ *تم إلغاء حظر المستخدم!*
┃━━━━━━━━━━━━━━━━━━━━━
┃👤 *المستخدم:* @${userName}
┃✨ *الحالة:* يمكنه استخدام البوت الآن
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
            
            await sock.sendMessage(chatId, { 
                text: successMessage,
                mentions: [userToUnban],
                ...channelInfo 
            });
            
            // إظهار تفاعل النجاح
            await sock.sendMessage(chatId, {
                react: { text: '✅', key: message.key }
            });
            
        } else {
            const notBannedMessage = `╭━━━≪•🔍 *معلومات الحظر* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃⚠️ *المستخدم غير محظور!*
┃━━━━━━━━━━━━━━━━━━━━━
┃👤 *المستخدم:* @${userName}
┃✅ *الحالة:* يمكنه استخدام البوت بالفعل
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
            
            await sock.sendMessage(chatId, { 
                text: notBannedMessage,
                mentions: [userToUnban],
                ...channelInfo 
            });
        }
        
    } catch (error) {
        console.error('خطأ في أمر إلغاء الحظر:', error);
        
        let errorMessage = '❌ *حدث خطأ!*\n⚠️ تعذر إلغاء حظر المستخدم. يرجى المحاولة لاحقاً.';
        
        if (error.message && error.message.includes('ENOENT')) {
            errorMessage = '❌ *خطأ في الملفات!*\n⚠️ يرجى التأكد من وجود ملف البيانات.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage,
            ...channelInfo 
        }, { quoted: message });
    }
}

module.exports = unbanCommand;