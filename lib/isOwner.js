const settings = require('../settings');
const { isSudo } = require('./index');

/**
 * التحقق مما إذا كان المستخدم هو المطور أو مستخدماً خاصاً (Sudo)
 * @param {string} senderId - معرف المرسل
 * @param {Object} sock - كائن الاتصال (اختياري)
 * @param {string} chatId - معرف المجموعة (اختياري)
 * @returns {Promise<boolean>} - true إذا كان المطور أو مستخدماً خاصاً
 */
async function isOwnerOrSudo(senderId, sock = null, chatId = null) {
    const ownerJid = settings.ownerNumber + "@s.whatsapp.net";
    const ownerNumberClean = settings.ownerNumber.split(':')[0].split('@')[0];
    
    // مطابقة مباشرة مع JID المطور
    if (senderId === ownerJid) {
        return true;
    }
    
    // استخراج الأجزاء الرقمية من المرسل
    const senderIdClean = senderId.split(':')[0].split('@')[0];
    const senderLidNumeric = senderId.includes('@lid') ? senderId.split('@')[0].split(':')[0] : '';
    
    // التحقق من تطابق رقم هاتف المرسل مع رقم المطور
    if (senderIdClean === ownerNumberClean) {
        return true;
    }
    
    // في المجموعات، التحقق من تطابق LID المرسل مع LID البوت (المطور يستخدم نفس حساب البوت)
    if (sock && chatId && chatId.endsWith('@g.us') && senderId.includes('@lid')) {
        try {
            // الحصول على LID البوت
            const botLid = sock.user?.lid || '';
            const botLidNumeric = botLid.includes(':') ? botLid.split(':')[0] : (botLid.includes('@') ? botLid.split('@')[0] : botLid);
            
            // التحقق من تطابق LID المرسل مع LID البوت
            if (senderLidNumeric && botLidNumeric && senderLidNumeric === botLidNumeric) {
                return true;
            }
            
            // التحقق من بيانات المشاركين للحصول على مطابقة إضافية
            const metadata = await sock.groupMetadata(chatId);
            const participants = metadata.participants || [];
            
            const participant = participants.find(p => {
                const pLid = p.lid || '';
                const pLidNumeric = pLid.includes(':') ? pLid.split(':')[0] : (pLid.includes('@') ? pLid.split('@')[0] : pLid);
                const pId = p.id || '';
                const pIdClean = pId.split(':')[0].split('@')[0];
                
                return (
                    p.lid === senderId || 
                    p.id === senderId ||
                    pLidNumeric === senderLidNumeric ||
                    pIdClean === senderIdClean ||
                    pIdClean === ownerNumberClean
                );
            });
            
            if (participant) {
                const participantId = participant.id || '';
                const participantLid = participant.lid || '';
                const participantIdClean = participantId.split(':')[0].split('@')[0];
                const participantLidNumeric = participantLid.includes(':') ? participantLid.split(':')[0] : (participantLid.includes('@') ? participantLid.split('@')[0] : participantLid);
                
                if (participantId === ownerJid || 
                    participantIdClean === ownerNumberClean ||
                    participantLidNumeric === botLidNumeric) {
                    return true;
                }
            }
        } catch (e) {
            console.error('❌ [isOwner] خطأ في التحقق من بيانات المشارك:', e);
        }
    }
    
    // التحقق من احتواء معرف المرسل على رقم المطور (حل احتياطي)
    if (senderId.includes(ownerNumberClean)) {
        return true;
    }
    
    // التحقق من حالة المستخدم الخاص (Sudo)
    try {
        return await isSudo(senderId);
    } catch (e) {
        console.error('❌ [isOwner] خطأ في التحقق من المستخدم الخاص:', e);
        return false;
    }
}

module.exports = isOwnerOrSudo;