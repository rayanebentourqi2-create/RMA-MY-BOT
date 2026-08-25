const { isJidGroup } = require('@whiskeysockets/baileys');
const { getAntilink, incrementWarningCount, resetWarningCount, isSudo } = require('../lib/index');
const isAdmin = require('../lib/isAdmin');
const config = require('../config');

const WARN_COUNT = config.WARN_COUNT || 3;

/**
 * التحقق من وجود رابط في النص
 * @param {string} str - النص المراد فحصه
 * @returns {boolean} - صحيح إذا كان النص يحتوي على رابط
 */
function containsURL(str) {
    const urlRegex = /(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?/i;
    return urlRegex.test(str);
}

/**
 * معالجة خاصية مكافحة الروابط في المجموعات
 * @param {object} msg - الرسالة المراد معالجتها
 * @param {object} sock - كائن الاتصال
 */
async function Antilink(msg, sock) {
    const jid = msg.key.remoteJid;
    
    // التحقق من أن الرسالة في مجموعة
    if (!isJidGroup(jid)) return;

    const SenderMessage = msg.message?.conversation || 
                         msg.message?.extendedTextMessage?.text || '';
    if (!SenderMessage || typeof SenderMessage !== 'string') return;

    const sender = msg.key.participant;
    if (!sender) return;
    
    // تخطي إذا كان المرسل مشرفاً أو مستخدماً خاصاً
    try {
        const { isSenderAdmin } = await isAdmin(sock, jid, sender);
        if (isSenderAdmin) return;
    } catch (_) {}
    
    const senderIsSudo = await isSudo(sender);
    if (senderIsSudo) return;

    // التحقق من وجود رابط
    if (!containsURL(SenderMessage.trim())) return;
    
    const antilinkConfig = await getAntilink(jid, 'on');
    if (!antilinkConfig) return;

    const action = antilinkConfig.action;
    const userName = sender.split('@')[0];
    
    try {
        // حذف الرسالة أولاً
        await sock.sendMessage(jid, { delete: msg.key });

        // إظهار تفاعل "تم الحذف"
        try {
            await sock.sendMessage(jid, {
                react: { text: '🔗', key: msg.key }
            });
        } catch(e) {}

        switch (action) {
            case 'delete':
                await sock.sendMessage(jid, { 
                    text: `╭━━━≪•🔗 *مـنـع الـروابـط* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃⚠️ *@${userName} الروابط غير مسموح بها!*
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`,
                    mentions: [sender] 
                });
                break;

            case 'kick':
                await sock.groupParticipantsUpdate(jid, [sender], 'remove');
                await sock.sendMessage(jid, {
                    text: `╭━━━≪•🔗 *مـنـع الـروابـط* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🚫 *@${userName} تم طرده لإرسال روابط!*
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`,
                    mentions: [sender]
                });
                break;

            case 'warn':
                const warningCount = await incrementWarningCount(jid, sender);
                if (warningCount >= WARN_COUNT) {
                    await sock.groupParticipantsUpdate(jid, [sender], 'remove');
                    await resetWarningCount(jid, sender);
                    await sock.sendMessage(jid, {
                        text: `╭━━━≪•🔗 *مـنـع الـروابـط* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🚫 *@${userName} تم طرده بعد ${WARN_COUNT} تحذيرات!*
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`,
                        mentions: [sender]
                    });
                } else {
                    await sock.sendMessage(jid, {
                        text: `╭━━━≪•🔗 *مـنـع الـروابـط* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃⚠️ *@${userName} تحذير ${warningCount}/${WARN_COUNT} لإرسال روابط*
┃━━━━━━━━━━━━━━━━━━━━━
┃💡 *تجنب إرسال الروابط لتجنب الطرد*
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`,
                        mentions: [sender]
                    });
                }
                break;
        }
    } catch (error) {
        console.error('خطأ في مكافحة الروابط:', error);
    }
}

module.exports = { Antilink };