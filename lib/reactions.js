const fs = require('fs');
const path = require('path');

// قائمة الإيموجيات لتفاعلات الأوامر
const commandEmojis = ['⏳', '🔄', '✨', '🤖', '📌'];

// مسار تخزين حالة التفاعل التلقائي
const USER_GROUP_DATA = path.join(__dirname, '../data/userGroupData.json');

/**
 * تحميل حالة التفاعل التلقائي من الملف
 * @returns {boolean} - حالة التفاعل التلقائي
 */
function loadAutoReactionState() {
    try {
        if (fs.existsSync(USER_GROUP_DATA)) {
            const data = JSON.parse(fs.readFileSync(USER_GROUP_DATA, 'utf8'));
            return data.autoReaction || false;
        }
    } catch (error) {
        console.error('خطأ في تحميل حالة التفاعل التلقائي:', error);
    }
    return false;
}

/**
 * حفظ حالة التفاعل التلقائي إلى الملف
 * @param {boolean} state - الحالة المراد حفظها
 */
function saveAutoReactionState(state) {
    try {
        const data = fs.existsSync(USER_GROUP_DATA) 
            ? JSON.parse(fs.readFileSync(USER_GROUP_DATA, 'utf8'))
            : { groups: [], chatbot: {} };
        
        data.autoReaction = state;
        fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('خطأ في حفظ حالة التفاعل التلقائي:', error);
    }
}

// تخزين حالة التفاعل التلقائي
let isAutoReactionEnabled = loadAutoReactionState();

/**
 * الحصول على إيموجي عشوائي من القائمة
 * @returns {string} - إيموجي عشوائي
 */
function getRandomEmoji() {
    return commandEmojis[Math.floor(Math.random() * commandEmojis.length)];
}

/**
 * إضافة تفاعل لرسالة الأمر
 * @param {Object} sock - كائن الاتصال
 * @param {Object} message - الرسالة
 */
async function addCommandReaction(sock, message) {
    try {
        if (!isAutoReactionEnabled || !message?.key?.id) return;
        
        const emoji = getRandomEmoji();
        await sock.sendMessage(message.key.remoteJid, {
            react: {
                text: emoji,
                key: message.key
            }
        });
    } catch (error) {
        console.error('خطأ في إضافة تفاعل الأمر:', error);
    }
}

/**
 * معالجة أمر التحكم في التفاعلات التلقائية
 * @param {Object} sock - كائن الاتصال
 * @param {string} chatId - معرف المحادثة
 * @param {Object} message - الرسالة
 * @param {boolean} isOwner - هل المستخدم هو المطور
 */
async function handleAreactCommand(sock, chatId, message, isOwner) {
    try {
        if (!isOwner) {
            await sock.sendMessage(chatId, { 
                text: '⛔ *غير مصرح!*\n👑 هذا الأمر متاح فقط لمطور البوت!',
                quoted: message
            });
            return;
        }

        const args = message.message?.conversation?.split(' ') || [];
        const action = args[1]?.toLowerCase();

        if (action === 'on' || action === 'تفعيل') {
            isAutoReactionEnabled = true;
            saveAutoReactionState(true);
            await sock.sendMessage(chatId, { 
                text: '✅ *تم التفعيل بنجاح!*\n✨ سيتم الآن إضافة تفاعلات تلقائية عند استخدام الأوامر.',
                quoted: message
            });
        } else if (action === 'off' || action === 'تعطيل') {
            isAutoReactionEnabled = false;
            saveAutoReactionState(false);
            await sock.sendMessage(chatId, { 
                text: '✅ *تم التعطيل بنجاح!*\n❌ تم إيقاف التفاعلات التلقائية للأوامر.',
                quoted: message
            });
        } else if (action === 'list' || action === 'قائمة') {
            const emojisList = commandEmojis.map(e => `• ${e}`).join('\n');
            await sock.sendMessage(chatId, { 
                text: `🎨 *قائمة التفاعلات المتاحة*\n\n✨ *الإيموجيات:*\n${emojisList}\n\n📌 *الحالة:* ${isAutoReactionEnabled ? '🟢 مفعل' : '🔴 معطل'}\n\n📝 *الاستخدام:*\n• .areact تفعيل - تفعيل التفاعلات\n• .areact تعطيل - تعطيل التفاعلات`,
                quoted: message
            });
        } else {
            const currentState = isAutoReactionEnabled ? '🟢 مفعل' : '🔴 معطل';
            await sock.sendMessage(chatId, { 
                text: `✨ *التفاعلات التلقائية - JAWAD.BOT*\n\n📌 *الحالة الحالية:* ${currentState}\n\n📝 *الأوامر المتاحة:*\n• .areact تفعيل - تفعيل التفاعلات التلقائية\n• .areact تعطيل - تعطيل التفاعلات التلقائية\n• .areact قائمة - عرض قائمة الإيموجيات\n\n💡 *سيتم إضافة تفاعل تلقائي ⏳ عند استخدام أي أمر*`,
                quoted: message
            });
        }
    } catch (error) {
        console.error('خطأ في معالجة أمر التفاعلات التلقائية:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ *حدث خطأ!*\n⚠️ تعذر التحكم في التفاعلات التلقائية.',
            quoted: message
        });
    }
}

module.exports = {
    addCommandReaction,
    handleAreactCommand
};