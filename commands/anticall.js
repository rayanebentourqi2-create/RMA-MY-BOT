const fs = require('fs');
const path = require('path');

const ANTICALL_PATH = path.join(__dirname, '../data/anticall.json');

// دالة قراءة الحالة
function readState() {
    try {
        if (!fs.existsSync(ANTICALL_PATH)) return { enabled: false };
        const raw = fs.readFileSync(ANTICALL_PATH, 'utf8');
        const data = JSON.parse(raw || '{}');
        return { enabled: !!data.enabled };
    } catch (error) {
        console.error('خطأ في قراءة حالة منع المكالمات:', error);
        return { enabled: false };
    }
}

// دالة حفظ الحالة
function writeState(enabled) {
    try {
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(ANTICALL_PATH, JSON.stringify({ enabled: !!enabled }, null, 2));
        console.log(`✅ تم ${enabled ? 'تفعيل' : 'تعطيل'} منع المكالمات`);
    } catch (error) {
        console.error('خطأ في حفظ حالة منع المكالمات:', error);
    }
}

// الأمر الرئيسي
async function anticallCommand(sock, chatId, message, args, isOwner) {
    // التحقق من صلاحيات المطور
    if (!isOwner && !message.key.fromMe) {
        await sock.sendMessage(chatId, { 
            text: '⛔ *للأسف!*\nهذا الأمر متاح فقط لمطور البوت.',
            contextInfo: {
                forwardingScore: 0,
                isForwarded: false
            }
        }, { quoted: message });
        return;
    }

    const state = readState();
    const sub = (args || '').trim().toLowerCase();

    if (!sub || (sub !== 'on' && sub !== 'off' && sub !== 'status' && sub !== 'تفعيل' && sub !== 'تعطيل' && sub !== 'حالة')) {
        await sock.sendMessage(chatId, { 
            text: `*📵 منع المكالمات - JAWAD.BOT*\n\n` +
                  `📌 *الأوامر المتاحة:*\n` +
                  `• .منع المكالمات تفعيل - تفعيل حظر المكالمات الواردة تلقائياً\n` +
                  `• .منع المكالمات تعطيل - تعطيل ميزة منع المكالمات\n` +
                  `• .منع المكالمات حالة - عرض الحالة الحالية\n\n` +
                  `📝 *الأوامر الإنجليزية:*\n` +
                  `• .anticall on\n` +
                  `• .anticall off\n` +
                  `• .anticall status\n\n` +
                  `✅ *الحالة الحالية:* ${state.enabled ? '🟢 مفعل' : '🔴 معطل'}`
        }, { quoted: message });
        return;
    }

    // معالجة الحالة
    if (sub === 'status' || sub === 'حالة') {
        const statusText = state.enabled ? '🟢 *مفعل* ✅' : '🔴 *معطل* ❌';
        await sock.sendMessage(chatId, { 
            text: `📵 *منع المكالمات*\n\nالحالة: ${statusText}\n\n${state.enabled ? 'سيتم رفض المكالمات الواردة وحظر المتصلين تلقائياً.' : 'الميزة معطلة حالياً.'}`
        }, { quoted: message });
        return;
    }

    // تفعيل أو تعطيل
    const enable = (sub === 'on' || sub === 'تفعيل');
    writeState(enable);
    
    const statusText = enable ? '✅ *تم التفعيل بنجاح!*' : '❌ *تم التعطيل بنجاح!*';
    const messageText = enable 
        ? '📵 سيتم الآن رفض جميع المكالمات الواردة وحظر المتصلين تلقائياً.'
        : '📞 تم تعطيل ميزة منع المكالمات. يمكنك الآن استقبال المكالمات بشكل طبيعي.';
    
    await sock.sendMessage(chatId, { 
        text: `📵 *منع المكالمات*\n\n${statusText}\n${messageText}`
    }, { quoted: message });
}

module.exports = { anticallCommand, readState };