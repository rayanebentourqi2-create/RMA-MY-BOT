const fs = require('fs');
const path = require('path');
const { channelInfo } = require('../lib/messageConfig');
const isAdmin = require('../lib/isAdmin');
const { isSudo } = require('../lib/index');

// مسار ملف المحظورين
const BANNED_FILE_PATH = path.join(__dirname, '../data/banned.json');

// تهيئة ملف المحظورين
function initializeBannedFile() {
    try {
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        if (!fs.existsSync(BANNED_FILE_PATH)) {
            fs.writeFileSync(BANNED_FILE_PATH, JSON.stringify([], null, 2));
        }
    } catch (error) {
        console.error('خطأ في تهيئة ملف المحظورين:', error);
    }
}

async function banCommand(sock, chatId, message) {
    try {
        initializeBannedFile();
        
        // التحقق من الصلاحيات حسب نوع المحادثة
        const isGroup = chatId.endsWith('@g.us');
        
        if (isGroup) {
            const senderId = message.key.participant || message.key.remoteJid;
            const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
            
            if (!isBotAdmin) {
                await sock.sendMessage(chatId, { 
                    text: '❌ *خطأ!*\n⚠️ الرجاء جعل البوت مشرفاً أولاً لاستخدام أمر الحظر.', 
                    ...channelInfo 
                }, { quoted: message });
                return;
            }
            
            if (!isSenderAdmin && !message.key.fromMe) {
                await sock.sendMessage(chatId, { 
                    text: '⛔ *غير مصرح!*\n👑 فقط مشرفي المجموعة يمكنهم استخدام أمر الحظر.', 
                    ...channelInfo 
                }, { quoted: message });
                return;
            }
        } else {
            const senderId = message.key.participant || message.key.remoteJid;
            const senderIsSudo = await isSudo(senderId);
            
            if (!message.key.fromMe && !senderIsSudo) {
                await sock.sendMessage(chatId, { 
                    text: '⛔ *غير مصرح!*\n🔒 فقط مطور البوت يمكنه استخدام أمر الحظر في الخاص.', 
                    ...channelInfo 
                }, { quoted: message });
                return;
            }
        }
        
        // تحديد المستخدم المطلوب حظره
        let userToBan;
        
        // التحقق من وجود مستخدم مشار إليه
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            userToBan = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        // التحقق من وجود رد على رسالة
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToBan = message.message.extendedTextMessage.contextInfo.participant;
        }
        
        if (!userToBan) {
            await sock.sendMessage(chatId, { 
                text: '🔨 *أمر الحظر - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.حظر @مستخدم` أو قم بالرد على رسالة المستخدم\n\n📝 *مثال:*\n`.حظر @DarkXecutor`\n\n✨ *سيتم حظر المستخدم من استخدام البوت*',
                ...channelInfo 
            }, { quoted: message });
            return;
        }
        
        // إظهار تفاعل "جاري المعالجة"
        await sock.sendMessage(chatId, {
            react: { text: '🔨', key: message.key }
        });
        
        // منع حظر البوت نفسه
        try {
            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            if (userToBan === botId || userToBan === botId.replace('@s.whatsapp.net', '@lid')) {
                await sock.sendMessage(chatId, { 
                    text: '⚠️ *لا يمكن حظر البوت نفسه!*\n🤖 لا يمكنك حظر حساب البوت.', 
                    ...channelInfo 
                }, { quoted: message });
                return;
            }
        } catch(e) {}
        
        // قراءة قائمة المحظورين
        const bannedUsers = JSON.parse(fs.readFileSync(BANNED_FILE_PATH, 'utf8'));
        const userName = userToBan.split('@')[0];
        
        if (!bannedUsers.includes(userToBan)) {
            // إضافة المستخدم إلى قائمة المحظورين
            bannedUsers.push(userToBan);
            fs.writeFileSync(BANNED_FILE_PATH, JSON.stringify(bannedUsers, null, 2));
            
            const successMessage = `╭━━━≪•🔨 *الـحـظـر* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃✅ *تم حظر المستخدم بنجاح!*
┃━━━━━━━━━━━━━━━━━━━━━
┃👤 *المستخدم:* @${userName}
┃🚫 *الحالة:* محظور من استخدام البوت
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
            
            await sock.sendMessage(chatId, { 
                text: successMessage,
                mentions: [userToBan],
                ...channelInfo 
            });
            
            // إظهار تفاعل النجاح
            await sock.sendMessage(chatId, {
                react: { text: '✅', key: message.key }
            });
            
        } else {
            const alreadyBannedMessage = `╭━━━≪•🔍 *مـعـلومـات الـحـظـر* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃⚠️ *المستخدم محظور بالفعل!*
┃━━━━━━━━━━━━━━━━━━━━━
┃👤 *المستخدم:* @${userName}
┃🚫 *الحالة:* محظور بالفعل
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
            
            await sock.sendMessage(chatId, { 
                text: alreadyBannedMessage,
                mentions: [userToBan],
                ...channelInfo 
            });
        }
        
    } catch (error) {
        console.error('خطأ في أمر الحظر:', error);
        
        let errorMessage = '❌ *حدث خطأ!*\n⚠️ تعذر حظر المستخدم. يرجى المحاولة لاحقاً.';
        
        if (error.message && error.message.includes('ENOENT')) {
            errorMessage = '❌ *خطأ في الملفات!*\n⚠️ يرجى التأكد من وجود ملف البيانات.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage,
            ...channelInfo 
        }, { quoted: message });
    }
}

module.exports = banCommand;