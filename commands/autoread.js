/**
 * JAWAD.BOT - بوت واتساب
 * أمر القراءة التلقائية - قراءة جميع الرسائل تلقائياً
 */

const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

// مسار تخزين الإعدادات
const configPath = path.join(__dirname, '..', 'data', 'autoread.json');

// تهيئة ملف الإعدادات إذا لم يكن موجوداً
function initConfig() {
    try {
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        if (!fs.existsSync(configPath)) {
            fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
        }
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
        console.error('خطأ في تهيئة إعدادات القراءة التلقائية:', error);
        return { enabled: false };
    }
}

// أمر القراءة التلقائية
async function autoreadCommand(sock, chatId, message) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!message.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, {
                text: '⛔ *غير مصرح!*\n👑 هذا الأمر متاح فقط لمطور البوت!',
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363427092431731@newsletter',
                        newsletterName: 'JAWAD.BOT',
                        serverMessageId: -1
                    }
                }
            }, { quoted: message });
            return;
        }

        // الحصول على معاملات الأمر
        const args = message.message?.conversation?.trim().split(' ').slice(1) || 
                    message.message?.extendedTextMessage?.text?.trim().split(' ').slice(1) || [];
        
        // قراءة الإعدادات الحالية
        const config = initConfig();
        
        // تبديل الحالة بناءً على المعامل أو تبديل الحالة الحالية
        if (args.length > 0) {
            const action = args[0].toLowerCase();
            if (action === 'on' || action === 'تفعيل') {
                config.enabled = true;
            } else if (action === 'off' || action === 'تعطيل') {
                config.enabled = false;
            } else if (action === 'status' || action === 'حالة') {
                const statusText = config.enabled ? '🟢 مفعل' : '🔴 معطل';
                await sock.sendMessage(chatId, {
                    text: `📖 *القراءة التلقائية - JAWAD.BOT*\n\n📌 *الحالة:* ${statusText}\n\n📝 *لتفعيل:* .قراءة تلقائية تفعيل\n📝 *لتعطيل:* .قراءة تلقائية تعطيل\n\n✨ *سيتم قراءة الرسائل تلقائياً عند تفعيل هذه الميزة*`,
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363427092431731@newsletter',
                            newsletterName: 'JAWAD.BOT',
                            serverMessageId: -1
                        }
                    }
                }, { quoted: message });
                return;
            } else {
                await sock.sendMessage(chatId, {
                    text: '❌ *خيار غير صالح!*\n📌 استخدم: .قراءة تلقائية تفعيل أو .قراءة تلقائية تعطيل',
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363427092431731@newsletter',
                            newsletterName: 'JAWAD.BOT',
                            serverMessageId: -1
                        }
                    }
                }, { quoted: message });
                return;
            }
        } else {
            // تبديل الحالة الحالية
            config.enabled = !config.enabled;
        }
        
        // حفظ الإعدادات المحدثة
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        // إرسال رسالة تأكيد
        const statusMsg = config.enabled ? '✅ *تم التفعيل!*\n📖 سيتم قراءة جميع الرسائل تلقائياً.' : '❌ *تم التعطيل!*\n📖 تم إيقاف القراءة التلقائية للرسائل.';
        
        await sock.sendMessage(chatId, {
            text: `📖 *القراءة التلقائية*\n\n${statusMsg}`,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363427092431731@newsletter',
                    newsletterName: 'JAWAD.BOT',
                    serverMessageId: -1
                }
            }
        }, { quoted: message });
        
    } catch (error) {
        console.error('خطأ في أمر القراءة التلقائية:', error);
        await sock.sendMessage(chatId, {
            text: '❌ *حدث خطأ!*\n⚠️ تعذر معالجة أمر القراءة التلقائية.',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363427092431731@newsletter',
                    newsletterName: 'JAWAD.BOT',
                    serverMessageId: -1
                }
            }
        }, { quoted: message });
    }
}

// دالة للتحقق من تفعيل القراءة التلقائية
function isAutoreadEnabled() {
    try {
        const config = initConfig();
        return config.enabled;
    } catch (error) {
        console.error('خطأ في التحقق من حالة القراءة التلقائية:', error);
        return false;
    }
}

// دالة للتحقق من ذكر البوت في الرسالة
function isBotMentionedInMessage(message, botNumber) {
    if (!message.message) return false;
    
    const messageTypes = [
        'extendedTextMessage', 'imageMessage', 'videoMessage', 'stickerMessage',
        'documentMessage', 'audioMessage', 'contactMessage', 'locationMessage'
    ];
    
    // التحقق من الإشارات الصريحة في mentionedJid
    for (const type of messageTypes) {
        if (message.message[type]?.contextInfo?.mentionedJid) {
            const mentionedJid = message.message[type].contextInfo.mentionedJid;
            if (mentionedJid.some(jid => jid === botNumber)) {
                return true;
            }
        }
    }
    
    // التحقق من النص
    const textContent = 
        message.message.conversation || 
        message.message.extendedTextMessage?.text ||
        message.message.imageMessage?.caption ||
        message.message.videoMessage?.caption || '';
    
    if (textContent) {
        const botUsername = botNumber.split('@')[0];
        if (textContent.includes(`@${botUsername}`)) {
            return true;
        }
        
        const botNames = [global.botname?.toLowerCase(), 'jawad', 'jawad bot', 'جاواد', 'بوت'];
        const words = textContent.toLowerCase().split(/\s+/);
        if (botNames.some(name => words.includes(name))) {
            return true;
        }
    }
    
    return false;
}

// دالة معالجة القراءة التلقائية
async function handleAutoread(sock, message) {
    if (isAutoreadEnabled()) {
        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotMentioned = isBotMentionedInMessage(message, botNumber);
        
        if (isBotMentioned) {
            // إذا تم ذكر البوت، لا نقرأ الرسالة (تبقى غير مقروءة في الواجهة)
            return false;
        } else {
            // للرسائل العادية، نقرأها تلقائياً
            const key = { remoteJid: message.key.remoteJid, id: message.key.id, participant: message.key.participant };
            await sock.readMessages([key]);
            return true;
        }
    }
    return false;
}

module.exports = {
    autoreadCommand,
    isAutoreadEnabled,
    isBotMentionedInMessage,
    handleAutoread
};