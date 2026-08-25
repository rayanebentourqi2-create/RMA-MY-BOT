const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

const PMBLOCKER_PATH = path.join(__dirname, '../data/pmblocker.json');

function readState() {
    try {
        if (!fs.existsSync(PMBLOCKER_PATH)) return { 
            enabled: false, 
            message: '🚫 *الرسائل الخاصة مغلقة!*\nلا يمكنك مراسلة البوت مباشرة. يرجى التواصل مع المطور في المجموعات فقط.' 
        };
        const raw = fs.readFileSync(PMBLOCKER_PATH, 'utf8');
        const data = JSON.parse(raw || '{}');
        return {
            enabled: !!data.enabled,
            message: typeof data.message === 'string' && data.message.trim() ? data.message : '🚫 *الرسائل الخاصة مغلقة!*\nلا يمكنك مراسلة البوت مباشرة. يرجى التواصل مع المطور في المجموعات فقط.'
        };
    } catch(e) {
        return { 
            enabled: false, 
            message: '🚫 *الرسائل الخاصة مغلقة!*\nلا يمكنك مراسلة البوت مباشرة. يرجى التواصل مع المطور في المجموعات فقط.' 
        };
    }
}

function writeState(enabled, message) {
    try {
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        const current = readState();
        const payload = {
            enabled: !!enabled,
            message: typeof message === 'string' && message.trim() ? message : current.message
        };
        fs.writeFileSync(PMBLOCKER_PATH, JSON.stringify(payload, null, 2));
    } catch(e) {}
}

async function pmblockerCommand(sock, chatId, message, args) {
    const senderId = message.key.participant || message.key.remoteJid;
    const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
    
    if (!message.key.fromMe && !isOwner) {
        await sock.sendMessage(chatId, { 
            text: '⛔ *غير مصرح!*\n👑 هذا الأمر متاح فقط لمطور البوت!' 
        }, { quoted: message });
        return;
    }
    
    const argStr = (args || '').trim();
    const [sub, ...rest] = argStr.split(' ');
    const state = readState();

    if (!sub || !['on', 'off', 'status', 'setmsg', 'تفعيل', 'تعطيل', 'حالة', 'تعيين'].includes(sub.toLowerCase())) {
        await sock.sendMessage(chatId, { 
            text: '🚫 *حظر الرسائل الخاصة - JAWAD.BOT*\n\n📌 *الأوامر المتاحة:*\n\n• .حظر الخاص تفعيل - تفعيل حظر الرسائل الخاصة\n• .حظر الخاص تعطيل - تعطيل حظر الرسائل الخاصة\n• .حظر الخاص حالة - عرض الحالة الحالية\n• .حظر الخاص تعيين <نص> - تعيين رسالة التحذير' 
        }, { quoted: message });
        return;
    }

    const cmd = sub.toLowerCase();
    
    // حالة
    if (cmd === 'status' || cmd === 'حالة') {
        const statusText = state.enabled ? '🟢 مفعل' : '🔴 معطل';
        await sock.sendMessage(chatId, { 
            text: `🚫 *حظر الرسائل الخاصة*\n\n📌 *الحالة:* ${statusText}\n📝 *رسالة التحذير:*\n${state.message}` 
        }, { quoted: message });
        return;
    }

    // تعيين رسالة مخصصة
    if (cmd === 'setmsg' || cmd === 'تعيين') {
        const newMsg = rest.join(' ').trim();
        if (!newMsg) {
            await sock.sendMessage(chatId, { 
                text: '📌 *الاستخدام:*\n.حظر الخاص تعيين <الرسالة>\n\n📝 *مثال:*\n.حظر الخاص تعيين عذراً، البوت لا يستقبل رسائل خاصة.' 
            }, { quoted: message });
            return;
        }
        writeState(state.enabled, newMsg);
        await sock.sendMessage(chatId, { 
            text: '✅ *تم تحديث رسالة حظر الرسائل الخاصة!*' 
        }, { quoted: message });
        return;
    }

    // تفعيل أو تعطيل
    const enable = (cmd === 'on' || cmd === 'تفعيل');
    writeState(enable);
    
    const statusMsg = enable 
        ? '✅ *تم تفعيل حظر الرسائل الخاصة!*\n🚫 لن يتمكن أي شخص من مراسلة البوت مباشرة.'
        : '✅ *تم تعطيل حظر الرسائل الخاصة!*\n📩 يمكن للجميع الآن مراسلة البوت مباشرة.';
    
    await sock.sendMessage(chatId, { text: statusMsg }, { quoted: message });
}

module.exports = { pmblockerCommand, readState };