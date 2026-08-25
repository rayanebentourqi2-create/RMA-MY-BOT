const fs = require('fs');
const path = require('path');

function readJsonSafe(pathFile, fallback) {
    try {
        const txt = fs.readFileSync(pathFile, 'utf8');
        return JSON.parse(txt);
    } catch (_) {
        return fallback;
    }
}

const isOwnerOrSudo = require('../lib/isOwner');

async function settingsCommand(sock, chatId, message) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!message.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { 
                text: '⛔ *غير مصرح!*\n👑 هذا الأمر متاح فقط لمطور البوت!' 
            }, { quoted: message });
            return;
        }

        const isGroup = chatId.endsWith('@g.us');
        const dataDir = path.join(process.cwd(), 'data');

        const mode = readJsonSafe(`${dataDir}/messageCount.json`, { isPublic: true });
        const autoStatus = readJsonSafe(`${dataDir}/autoStatus.json`, { enabled: false });
        const autoread = readJsonSafe(`${dataDir}/autoread.json`, { enabled: false });
        const autotyping = readJsonSafe(`${dataDir}/autotyping.json`, { enabled: false });
        const pmblocker = readJsonSafe(`${dataDir}/pmblocker.json`, { enabled: false });
        const anticall = readJsonSafe(`${dataDir}/anticall.json`, { enabled: false });
        const userGroupData = readJsonSafe(`${dataDir}/userGroupData.json`, {
            antilink: {}, antibadword: {}, welcome: {}, goodbye: {}, chatbot: {}, antitag: {}
        });
        const autoReaction = Boolean(userGroupData.autoReaction);

        // إعدادات خاصة بالمجموعة
        const groupId = isGroup ? chatId : null;
        const antilinkOn = groupId ? Boolean(userGroupData.antilink && userGroupData.antilink[groupId]) : false;
        const antibadwordOn = groupId ? Boolean(userGroupData.antibadword && userGroupData.antibadword[groupId]) : false;
        const welcomeOn = groupId ? Boolean(userGroupData.welcome && userGroupData.welcome[groupId]) : false;
        const goodbyeOn = groupId ? Boolean(userGroupData.goodbye && userGroupData.goodbye[groupId]) : false;
        const chatbotOn = groupId ? Boolean(userGroupData.chatbot && userGroupData.chatbot[groupId]) : false;
        const antitagCfg = groupId ? (userGroupData.antitag && userGroupData.antitag[groupId]) : null;

        const lines = [];
        lines.push('⚙️ *إعدادات البوت - JAWAD.BOT*');
        lines.push('━━━━━━━━━━━━━━━━━━━━━');
        lines.push('');
        lines.push(`📌 *وضع البوت:* ${mode.isPublic ? '🟢 عام' : '🔴 خاص'}`);
        lines.push(`📱 *حالات واتساب تلقائي:* ${autoStatus.enabled ? '🟢 مفعل' : '🔴 معطل'}`);
        lines.push(`📖 *قراءة تلقائية:* ${autoread.enabled ? '🟢 مفعلة' : '🔴 معطلة'}`);
        lines.push(`✍️ *كتابة تلقائية:* ${autotyping.enabled ? '🟢 مفعلة' : '🔴 معطلة'}`);
        lines.push(`🚫 *حظر الخاص:* ${pmblocker.enabled ? '🟢 مفعل' : '🔴 معطل'}`);
        lines.push(`📞 *منع المكالمات:* ${anticall.enabled ? '🟢 مفعل' : '🔴 معطل'}`);
        lines.push(`🎨 *تفاعل تلقائي:* ${autoReaction ? '🟢 مفعل' : '🔴 معطل'}`);
        
        if (groupId) {
            lines.push('');
            lines.push('━═━═━ *إعدادات المجموعة* ━═━═━');
            lines.push('');
            lines.push(`🔗 *منع الروابط:* ${antilinkOn ? '🟢 مفعل' : '🔴 معطل'}`);
            if (antilinkOn && userGroupData.antilink[groupId]) {
                const al = userGroupData.antilink[groupId];
                const actionText = al.action === 'delete' ? 'حذف' : (al.action === 'kick' ? 'طرد' : 'تحذير');
                lines.push(`   ⚙️ الإجراء: ${actionText}`);
            }
            
            lines.push(`🛡️ *منع الكلمات السيئة:* ${antibadwordOn ? '🟢 مفعل' : '🔴 معطل'}`);
            if (antibadwordOn && userGroupData.antibadword[groupId]) {
                const ab = userGroupData.antibadword[groupId];
                const actionText = ab.action === 'delete' ? 'حذف' : (ab.action === 'kick' ? 'طرد' : 'تحذير');
                lines.push(`   ⚙️ الإجراء: ${actionText}`);
            }
            
            lines.push(`👋 *الترحيب:* ${welcomeOn ? '🟢 مفعل' : '🔴 معطل'}`);
            lines.push(`👋 *الوداع:* ${goodbyeOn ? '🟢 مفعل' : '🔴 معطل'}`);
            lines.push(`🤖 *بوت المحادثة:* ${chatbotOn ? '🟢 مفعل' : '🔴 معطل'}`);
            lines.push(`🚫 *منع منشن الجميع:* ${antitagCfg && antitagCfg.enabled ? '🟢 مفعل' : '🔴 معطل'}`);
            if (antitagCfg && antitagCfg.enabled) {
                const actionText = antitagCfg.action === 'delete' ? 'حذف' : 'طرد';
                lines.push(`   ⚙️ الإجراء: ${actionText}`);
            }
        } else {
            lines.push('');
            lines.push('💡 *ملاحظة:* إعدادات المجموعة تظهر عند استخدام الأمر داخل مجموعة.');
        }

        lines.push('');
        lines.push('━━━━━━━━━━━━━━━━━━━━━');
        lines.push('🤖 *JAWAD.BOT*');

        await sock.sendMessage(chatId, { text: lines.join('\n') }, { quoted: message });
    } catch (error) {
        console.error('خطأ في أمر الإعدادات:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ *فشل قراءة الإعدادات!*\n⚠️ يرجى المحاولة لاحقاً.' 
        }, { quoted: message });
    }
}

module.exports = settingsCommand;