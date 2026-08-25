const isAdmin = require('../lib/isAdmin');
const store = require('../lib/lightweight_store');

async function deleteCommand(sock, chatId, message, senderId) {
    try {
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ *يجب أن يكون البوت مشرفاً لحذف الرسائل.*', 
                quoted: message 
            });
            return;
        }

        if (!isSenderAdmin && !message.key.fromMe) {
            await sock.sendMessage(chatId, { 
                text: '⛔ *غير مصرح!*\n👑 فقط المشرفين يمكنهم استخدام أمر الحذف.', 
                quoted: message 
            });
            return;
        }

        // إظهار تفاعل "جاري المعالجة"
        await sock.sendMessage(chatId, {
            react: { text: '🗑️', key: message.key }
        });

        // تحديد المستهدف وعدد الرسائل
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const parts = text.trim().split(/\s+/);
        let countArg = null;
        
        // التحقق من وجود رقم
        if (parts.length > 1) {
            const maybeNum = parseInt(parts[1], 10);
            if (!isNaN(maybeNum) && maybeNum > 0) {
                countArg = Math.min(maybeNum, 50);
            }
        }
        
        // التحقق من رد على رسالة
        const ctxInfo = message.message?.extendedTextMessage?.contextInfo || {};
        const repliedParticipant = ctxInfo.participant || null;
        const mentioned = Array.isArray(ctxInfo.mentionedJid) && ctxInfo.mentionedJid.length > 0 ? ctxInfo.mentionedJid[0] : null;
        
        // إذا لم يتم تحديد رقم ولكن هناك رد، الافتراضي 1
        if (countArg === null && repliedParticipant) {
            countArg = 1;
        }
        // إذا لم يتم تحديد رقم ولا رد ولا منشن، عرض رسالة المساعدة
        else if (countArg === null && !repliedParticipant && !mentioned) {
            await sock.sendMessage(chatId, { 
                text: '🗑️ *أمر حذف الرسائل - JAWAD.BOT*\n\n📌 *الاستخدام:*\n• `.حذف 5` - حذف آخر 5 رسائل من المجموعة\n• `.حذف 3 @مستخدم` - حذف آخر 3 رسائل من @مستخدم\n• (رد على رسالة) `.حذف 2` - حذف آخر 2 رسائل من الشخص الذي رديت عليه\n\n✨ *الحد الأقصى:* 50 رسالة' 
            }, { quoted: message });
            return;
        }
        // إذا لم يتم تحديد رقم ولكن تمت الإشارة لمستخدم، الافتراضي 1
        else if (countArg === null && mentioned) {
            countArg = 1;
        }

        // تحديد المستهدف
        let targetUser = null;
        let repliedMsgId = null;
        let deleteGroupMessages = false;
        
        if (repliedParticipant && ctxInfo.stanzaId) {
            targetUser = repliedParticipant;
            repliedMsgId = ctxInfo.stanzaId;
        } else if (mentioned) {
            targetUser = mentioned;
        } else {
            deleteGroupMessages = true;
        }

        // جمع آخر N رسائل من المستهدف
        const chatMessages = Array.isArray(store.messages[chatId]) ? store.messages[chatId] : [];
        const toDelete = [];
        const seenIds = new Set();

        if (deleteGroupMessages) {
            // حذف آخر N رسائل من المجموعة (أي مستخدم)
            for (let i = chatMessages.length - 1; i >= 0 && toDelete.length < countArg; i--) {
                const m = chatMessages[i];
                if (!seenIds.has(m.key.id)) {
                    if (!m.message?.protocolMessage && 
                        !m.key.fromMe && 
                        m.key.id !== message.key.id) {
                        toDelete.push(m);
                        seenIds.add(m.key.id);
                    }
                }
            }
        } else {
            // حذف رسائل مستخدم محدد
            if (repliedMsgId) {
                const repliedInStore = chatMessages.find(m => m.key.id === repliedMsgId && (m.key.participant || m.key.remoteJid) === targetUser);
                if (repliedInStore) {
                    toDelete.push(repliedInStore);
                    seenIds.add(repliedInStore.key.id);
                } else {
                    try {
                        await sock.sendMessage(chatId, {
                            delete: {
                                remoteJid: chatId,
                                fromMe: false,
                                id: repliedMsgId,
                                participant: repliedParticipant
                            }
                        });
                        countArg = Math.max(0, countArg - 1);
                    } catch(e) {}
                }
            }
            for (let i = chatMessages.length - 1; i >= 0 && toDelete.length < countArg; i--) {
                const m = chatMessages[i];
                const participant = m.key.participant || m.key.remoteJid;
                if (participant === targetUser && !seenIds.has(m.key.id)) {
                    if (!m.message?.protocolMessage) {
                        toDelete.push(m);
                        seenIds.add(m.key.id);
                    }
                }
            }
        }

        if (toDelete.length === 0) {
            const errorMsg = deleteGroupMessages 
                ? '❌ *لا توجد رسائل حديثة للحذف في المجموعة.*' 
                : '❌ *لا توجد رسائل حديثة للمستخدم المحدد.*';
            await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
            return;
        }

        // حذف الرسائل مع تأخير بسيط
        let deletedCount = 0;
        for (const m of toDelete) {
            try {
                const msgParticipant = deleteGroupMessages 
                    ? (m.key.participant || m.key.remoteJid) 
                    : (m.key.participant || targetUser);
                await sock.sendMessage(chatId, {
                    delete: {
                        remoteJid: chatId,
                        fromMe: false,
                        id: m.key.id,
                        participant: msgParticipant
                    }
                });
                deletedCount++;
                await new Promise(r => setTimeout(r, 300));
            } catch (e) {
                // تخطي الأخطاء
            }
        }

        // إظهار تفاعل النجاح
        if (deletedCount > 0) {
            await sock.sendMessage(chatId, {
                react: { text: '✅', key: message.key }
            });
        }

    } catch (err) {
        console.error('خطأ في أمر الحذف:', err);
        await sock.sendMessage(chatId, { 
            text: '❌ *حدث خطأ!*\n⚠️ تعذر حذف الرسائل.', 
            quoted: message 
        });
    }
}

module.exports = deleteCommand;