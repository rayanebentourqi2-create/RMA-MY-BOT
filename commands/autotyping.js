/**
 * JAWAD.BOT - بوت واتساب
 * أمر الكتابة التلقائية - إظهار حالة "يكتب..." في الواتساب
 */

const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

// مسار تخزين الإعدادات
const configPath = path.join(__dirname, '..', 'data', 'autotyping.json');

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
        console.error('خطأ في تهيئة إعدادات الكتابة التلقائية:', error);
        return { enabled: false };
    }
}

// أمر الكتابة التلقائية
async function autotypingCommand(sock, chatId, message) {
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
                    text: `✍️ *الكتابة التلقائية - JAWAD.BOT*\n\n📌 *الحالة:* ${statusText}\n\n📝 *لتفعيل:* .كتابة تلقائية تفعيل\n📝 *لتعطيل:* .كتابة تلقائية تعطيل\n\n✨ *سيتم إظهار حالة "يكتب..." عند استخدام البوت*`,
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
                    text: '❌ *خيار غير صالح!*\n📌 استخدم: .كتابة تلقائية تفعيل أو .كتابة تلقائية تعطيل',
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
        const statusMsg = config.enabled ? '✅ *تم التفعيل!*\n✍️ سيتم إظهار حالة "يكتب..." عند استخدام البوت.' : '❌ *تم التعطيل!*\n✍️ تم إيقاف إظهار حالة "يكتب..." للبوت.';
        
        await sock.sendMessage(chatId, {
            text: `✍️ *الكتابة التلقائية*\n\n${statusMsg}`,
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
        console.error('خطأ في أمر الكتابة التلقائية:', error);
        await sock.sendMessage(chatId, {
            text: '❌ *حدث خطأ!*\n⚠️ تعذر معالجة أمر الكتابة التلقائية.',
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

// دالة التحقق من تفعيل الكتابة التلقائية
function isAutotypingEnabled() {
    try {
        const config = initConfig();
        return config.enabled;
    } catch (error) {
        console.error('خطأ في التحقق من حالة الكتابة التلقائية:', error);
        return false;
    }
}

// دالة معالجة الكتابة التلقائية للرسائل العادية
async function handleAutotypingForMessage(sock, chatId, userMessage) {
    if (isAutotypingEnabled()) {
        try {
            await sock.presenceSubscribe(chatId);
            await sock.sendPresenceUpdate('available', chatId);
            await new Promise(resolve => setTimeout(resolve, 500));
            await sock.sendPresenceUpdate('composing', chatId);
            
            // محاكاة وقت الكتابة بناءً على طول الرسالة
            const typingDelay = Math.max(2000, Math.min(6000, userMessage.length * 100));
            await new Promise(resolve => setTimeout(resolve, typingDelay));
            
            await sock.sendPresenceUpdate('composing', chatId);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await sock.sendPresenceUpdate('paused', chatId);
            
            return true;
        } catch (error) {
            console.error('❌ خطأ في إظهار مؤشر الكتابة:', error);
            return false;
        }
    }
    return false;
}

// دالة معالجة الكتابة التلقائية للأوامر
async function handleAutotypingForCommand(sock, chatId) {
    if (isAutotypingEnabled()) {
        try {
            await sock.presenceSubscribe(chatId);
            await sock.sendPresenceUpdate('available', chatId);
            await new Promise(resolve => setTimeout(resolve, 500));
            await sock.sendPresenceUpdate('composing', chatId);
            
            const commandTypingDelay = 2000;
            await new Promise(resolve => setTimeout(resolve, commandTypingDelay));
            
            await sock.sendPresenceUpdate('composing', chatId);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await sock.sendPresenceUpdate('paused', chatId);
            
            return true;
        } catch (error) {
            console.error('❌ خطأ في إظهار مؤشر الكتابة للأمر:', error);
            return false;
        }
    }
    return false;
}

// دالة إظهار حالة الكتابة بعد تنفيذ الأمر
async function showTypingAfterCommand(sock, chatId) {
    if (isAutotypingEnabled()) {
        try {
            await sock.presenceSubscribe(chatId);
            await sock.sendPresenceUpdate('composing', chatId);
            await new Promise(resolve => setTimeout(resolve, 800));
            await sock.sendPresenceUpdate('paused', chatId);
            return true;
        } catch (error) {
            console.error('❌ خطأ في إظهار مؤشر الكتابة بعد الأمر:', error);
            return false;
        }
    }
    return false;
}

module.exports = {
    autotypingCommand,
    isAutotypingEnabled,
    handleAutotypingForMessage,
    handleAutotypingForCommand,
    showTypingAfterCommand
};