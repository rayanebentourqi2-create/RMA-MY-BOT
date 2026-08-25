const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

// إعدادات القناة
const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363427092431731@newsletter',
            newsletterName: 'JAWAD.BOT',
            serverMessageId: -1
        }
    }
};

// مسار تخزين إعدادات الحالات التلقائية
const configPath = path.join(__dirname, '../data/autoStatus.json');

// تهيئة ملف الإعدادات إذا لم يكن موجوداً
if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({ 
        enabled: false, 
        reactOn: false 
    }, null, 2));
}

async function autoStatusCommand(sock, chatId, msg, args) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!msg.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { 
                text: '⛔ *غير مصرح!*\n👑 هذا الأمر متاح فقط لمطور البوت!',
                ...channelInfo
            }, { quoted: msg });
            return;
        }

        // قراءة الإعدادات الحالية
        let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        // إذا لم توجد معاملات، عرض الحالة الحالية
        if (!args || args.length === 0) {
            const status = config.enabled ? '🟢 مفعل' : '🔴 معطل';
            const reactStatus = config.reactOn ? '🟢 مفعل' : '🔴 معطل';
            await sock.sendMessage(chatId, { 
                text: `📱 *إعدادات الحالات التلقائية - JAWAD.BOT*\n\n📌 *مشاهدة الحالات:* ${status}\n💫 *التفاعل مع الحالات:* ${reactStatus}\n\n📝 *الأوامر:*\n.autostatus تفعيل - تفعيل مشاهدة الحالات\n.autostatus تعطيل - تعطيل مشاهدة الحالات\n.autostatus تفاعل تفعيل - تفعيل التفاعل مع الحالات\n.autostatus تفاعل تعطيل - تعطيل التفاعل مع الحالات`,
                ...channelInfo
            }, { quoted: msg });
            return;
        }

        // معالجة الأوامر
        const command = args[0].toLowerCase();
        
        if (command === 'on' || command === 'تفعيل') {
            config.enabled = true;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            await sock.sendMessage(chatId, { 
                text: '✅ *تم التفعيل!*\n📱 سيتم الآن مشاهدة حالات جهات الاتصال تلقائياً.',
                ...channelInfo
            }, { quoted: msg });
        } else if (command === 'off' || command === 'تعطيل') {
            config.enabled = false;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            await sock.sendMessage(chatId, { 
                text: '❌ *تم التعطيل!*\n📱 تم إيقاف المشاهدة التلقائية للحالات.',
                ...channelInfo
            }, { quoted: msg });
        } else if (command === 'react' || command === 'تفاعل') {
            if (!args[1]) {
                await sock.sendMessage(chatId, { 
                    text: '❌ *يرجى تحديد تفعيل أو تعطيل للتفاعلات!*\n📌 استخدم: .autostatus تفاعل تفعيل أو .autostatus تفاعل تعطيل',
                    ...channelInfo
                }, { quoted: msg });
                return;
            }
            
            const reactCommand = args[1].toLowerCase();
            if (reactCommand === 'on' || reactCommand === 'تفعيل') {
                config.reactOn = true;
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                await sock.sendMessage(chatId, { 
                    text: '💫 *تم التفعيل!*\n✨ سيتم الآن التفاعل مع حالات جهات الاتصال تلقائياً.',
                    ...channelInfo
                }, { quoted: msg });
            } else if (reactCommand === 'off' || reactCommand === 'تعطيل') {
                config.reactOn = false;
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                await sock.sendMessage(chatId, { 
                    text: '❌ *تم التعطيل!*\n💫 تم إيقاف التفاعل التلقائي مع الحالات.',
                    ...channelInfo
                }, { quoted: msg });
            } else {
                await sock.sendMessage(chatId, { 
                    text: '❌ *أمر تفاعل غير صالح!*\n📌 استخدم: .autostatus تفاعل تفعيل أو .autostatus تفاعل تعطيل',
                    ...channelInfo
                }, { quoted: msg });
            }
        } else if (command === 'status' || command === 'حالة') {
            const status = config.enabled ? '🟢 مفعل' : '🔴 معطل';
            const reactStatus = config.reactOn ? '🟢 مفعل' : '🔴 معطل';
            await sock.sendMessage(chatId, { 
                text: `📱 *حالة إعدادات الحالات التلقائية*\n\n📌 *مشاهدة الحالات:* ${status}\n💫 *التفاعل مع الحالات:* ${reactStatus}`,
                ...channelInfo
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, { 
                text: '❌ *أمر غير صالح!*\n📌 استخدم:\n.autostatus تفعيل/تعطيل - تفعيل/تعطيل مشاهدة الحالات\n.autostatus تفاعل تفعيل/تعطيل - تفعيل/تعطيل التفاعل مع الحالات',
                ...channelInfo
            }, { quoted: msg });
        }

    } catch (error) {
        console.error('خطأ في أمر الحالات التلقائية:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ *حدث خطأ!*\n⚠️ ' + error.message,
            ...channelInfo
        }, { quoted: msg });
    }
}

// دالة التحقق من تفعيل مشاهدة الحالات التلقائية
function isAutoStatusEnabled() {
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config.enabled;
    } catch (error) {
        console.error('خطأ في التحقق من إعدادات الحالات:', error);
        return false;
    }
}

// دالة التحقق من تفعيل التفاعل مع الحالات
function isStatusReactionEnabled() {
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config.reactOn;
    } catch (error) {
        console.error('خطأ في التحقق من إعدادات التفاعل:', error);
        return false;
    }
}

// دالة التفاعل مع الحالة
async function reactToStatus(sock, statusKey) {
    try {
        if (!isStatusReactionEnabled()) {
            return;
        }

        await sock.relayMessage(
            'status@broadcast',
            {
                reactionMessage: {
                    key: {
                        remoteJid: 'status@broadcast',
                        id: statusKey.id,
                        participant: statusKey.participant || statusKey.remoteJid,
                        fromMe: false
                    },
                    text: '💚'
                }
            },
            {
                messageId: statusKey.id,
                statusJidList: [statusKey.remoteJid, statusKey.participant || statusKey.remoteJid]
            }
        );
    } catch (error) {
        console.error('❌ خطأ في التفاعل مع الحالة:', error.message);
    }
}

// دالة معالجة تحديثات الحالات
async function handleStatusUpdate(sock, status) {
    try {
        if (!isAutoStatusEnabled()) {
            return;
        }

        // تأخير لتجنب التقييد
        await new Promise(resolve => setTimeout(resolve, 1000));

        // معالجة الحالات من messages.upsert
        if (status.messages && status.messages.length > 0) {
            const msg = status.messages[0];
            if (msg.key && msg.key.remoteJid === 'status@broadcast') {
                try {
                    await sock.readMessages([msg.key]);
                    await reactToStatus(sock, msg.key);
                } catch (err) {
                    if (err.message?.includes('rate-overlimit')) {
                        console.log('⚠️ تم الوصول للحد الأقصى، جاري الانتظار قبل إعادة المحاولة...');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        await sock.readMessages([msg.key]);
                    } else {
                        throw err;
                    }
                }
                return;
            }
        }

        // معالجة تحديثات الحالة المباشرة
        if (status.key && status.key.remoteJid === 'status@broadcast') {
            try {
                await sock.readMessages([status.key]);
                await reactToStatus(sock, status.key);
            } catch (err) {
                if (err.message?.includes('rate-overlimit')) {
                    console.log('⚠️ تم الوصول للحد الأقصى، جاري الانتظار قبل إعادة المحاولة...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await sock.readMessages([status.key]);
                } else {
                    throw err;
                }
            }
            return;
        }

        // معالجة الحالات في التفاعلات
        if (status.reaction && status.reaction.key.remoteJid === 'status@broadcast') {
            try {
                await sock.readMessages([status.reaction.key]);
                await reactToStatus(sock, status.reaction.key);
            } catch (err) {
                if (err.message?.includes('rate-overlimit')) {
                    console.log('⚠️ تم الوصول للحد الأقصى، جاري الانتظار قبل إعادة المحاولة...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await sock.readMessages([status.reaction.key]);
                } else {
                    throw err;
                }
            }
            return;
        }

    } catch (error) {
        console.error('❌ خطأ في المشاهدة التلقائية للحالات:', error.message);
    }
}

module.exports = {
    autoStatusCommand,
    handleStatusUpdate
};