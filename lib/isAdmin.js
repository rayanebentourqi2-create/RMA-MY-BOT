/**
 * التحقق من صلاحيات المشرف للبوت والمستخدم في المجموعة
 * @param {Object} sock - كائن الاتصال
 * @param {string} chatId - معرف المجموعة
 * @param {string} senderId - معرف المرسل
 * @returns {Promise<{isSenderAdmin: boolean, isBotAdmin: boolean}>}
 */
async function isAdmin(sock, chatId, senderId) {
    try {
        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants || [];

        // استخراج رقم البوت النقي
        const botId = sock.user?.id || '';
        const botLid = sock.user?.lid || '';
        const botNumber = botId.includes(':') ? botId.split(':')[0] : (botId.includes('@') ? botId.split('@')[0] : botId);
        const botIdWithoutSuffix = botId.includes('@') ? botId.split('@')[0] : botId;
        
        // استخراج الجزء الرقمي من LID البوت
        const botLidNumeric = botLid.includes(':') ? botLid.split(':')[0] : (botLid.includes('@') ? botLid.split('@')[0] : botLid);
        const botLidWithoutSuffix = botLid.includes('@') ? botLid.split('@')[0] : botLid;

        const senderNumber = senderId.includes(':') ? senderId.split(':')[0] : (senderId.includes('@') ? senderId.split('@')[0] : senderId);
        const senderIdWithoutSuffix = senderId.includes('@') ? senderId.split('@')[0] : senderId;

        // التحقق مما إذا كان البوت مشرفاً
        const isBotAdmin = participants.some(p => {
            const pPhoneNumber = p.phoneNumber ? p.phoneNumber.split('@')[0] : '';
            const pId = p.id ? p.id.split('@')[0] : '';
            const pLid = p.lid ? p.lid.split('@')[0] : '';
            const pFullId = p.id || '';
            const pFullLid = p.lid || '';
            const pLidNumeric = pLid.includes(':') ? pLid.split(':')[0] : pLid;
            
            const botMatches = (
                botId === pFullId ||
                botId === pFullLid ||
                botLid === pFullLid ||
                botLidNumeric === pLidNumeric ||
                botLidWithoutSuffix === pLid ||
                botNumber === pPhoneNumber ||
                botNumber === pId ||
                botIdWithoutSuffix === pPhoneNumber ||
                botIdWithoutSuffix === pId ||
                (botLid && botLid.split('@')[0].split(':')[0] === pLid)
            );
            
            return botMatches && (p.admin === 'admin' || p.admin === 'superadmin');
        });

        // التحقق مما إذا كان المرسل مشرفاً
        const isSenderAdmin = participants.some(p => {
            const pPhoneNumber = p.phoneNumber ? p.phoneNumber.split('@')[0] : '';
            const pId = p.id ? p.id.split('@')[0] : '';
            const pLid = p.lid ? p.lid.split('@')[0] : '';
            const pFullId = p.id || '';
            const pFullLid = p.lid || '';
            
            const senderMatches = (
                senderId === pFullId ||
                senderId === pFullLid ||
                senderNumber === pPhoneNumber ||
                senderNumber === pId ||
                senderIdWithoutSuffix === pPhoneNumber ||
                senderIdWithoutSuffix === pId ||
                (pLid && senderIdWithoutSuffix === pLid)
            );
            
            return senderMatches && (p.admin === 'admin' || p.admin === 'superadmin');
        });

        return { isSenderAdmin, isBotAdmin };
    } catch (err) {
        console.error('❌ خطأ في التحقق من صلاحيات المشرف:', err);
        return { isSenderAdmin: false, isBotAdmin: false };
    }
}

module.exports = isAdmin;