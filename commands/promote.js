const { isAdmin } = require('../lib/isAdmin');

// دالة معالجة الترقية اليدوية عبر الأمر
async function promoteCommand(sock, chatId, mentionedJids, message) {
    try {
        // التحقق من أنها مجموعة
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ هذا الأمر يمكن استخدامه فقط في المجموعات!'
            }, { quoted: message });
            return;
        }

        // التحقق من صلاحيات البوت والمستخدم
        const senderId = message.key.participant || message.key.remoteJid;
        const adminStatus = await isAdmin(sock, chatId, senderId);
        
        if (!adminStatus.isBotAdmin) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ *الرجاء جعل البوت مشرفاً أولاً!*'
            }, { quoted: message });
            return;
        }

        if (!adminStatus.isSenderAdmin && !message.key.fromMe) {
            await sock.sendMessage(chatId, { 
                text: '⛔ *غير مصرح!*\n👑 فقط مشرفي المجموعة يمكنهم استخدام أمر الترقية.'
            }, { quoted: message });
            return;
        }

        let userToPromote = [];
        
        // التحقق من وجود مستخدمين مشار إليهم
        if (mentionedJids && mentionedJids.length > 0) {
            userToPromote = mentionedJids;
        }
        // التحقق من وجود رد على رسالة
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToPromote = [message.message.extendedTextMessage.contextInfo.participant];
        }
        
        if (userToPromote.length === 0) {
            await sock.sendMessage(chatId, { 
                text: '👑 *أمر الترقية - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.ترقية @مستخدم` أو قم بالرد على رسالة الشخص\n\n📝 *مثال:*\n`.ترقية @DarkXecutor`'
            }, { quoted: message });
            return;
        }

        // إظهار تفاعل "جاري الترقية"
        await sock.sendMessage(chatId, {
            react: { text: '👑', key: message.key }
        });

        // تأخير لتجنب التقييد
        await new Promise(resolve => setTimeout(resolve, 1000));

        await sock.groupParticipantsUpdate(chatId, userToPromote, "promote");
        
        // الحصول على أسماء المستخدمين المرفوعين
        const usernames = await Promise.all(userToPromote.map(async jid => {
            let name = jid.split('@')[0];
            try {
                const contact = await sock.getBusinessProfile(jid);
                if (contact && contact.name) name = contact.name;
            } catch(e) {}
            return `• @${jid.split('@')[0]}`;
        }));

        // الحصول على اسم من قام بالترقية
        const promoterJid = senderId;
        const promoterName = promoterJid.split('@')[0];

        const promotionMessage = `╭━━━≪•👑 *تـرقـيـة مـشـرف* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃👤 *المستخدم${userToPromote.length > 1 ? 'ات' : ''} المرفوع:*
┃${usernames.join('\n')}
┃━━━━━━━━━━━━━━━━━━━━━
┃👑 *تم الترقية بواسطة:* @${promoterName}
┃━━━━━━━━━━━━━━━━━━━━━
┃📅 *التاريخ:* ${new Date().toLocaleString('ar-EG')}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
        
        await sock.sendMessage(chatId, { 
            text: promotionMessage,
            mentions: [...userToPromote, promoterJid]
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر الترقية:', error);
        
        let errorMessage = '❌ *فشل ترقية المستخدم!*\n⚠️ تأكد من أن البوت مشرف ولديه الصلاحيات الكافية.';
        
        if (error.message && error.message.includes('rate')) {
            errorMessage = '⏳ *تم الوصول للحد الأقصى!*\n⚠️ يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
    }
}

// دالة معالجة حدث الترقية التلقائي
async function handlePromotionEvent(sock, groupId, participants, author) {
    try {
        if (!Array.isArray(participants) || participants.length === 0) {
            return;
        }

        const promotedUsernames = await Promise.all(participants.map(async jid => {
            const jidString = typeof jid === 'string' ? jid : (jid.id || jid.toString());
            let name = jidString.split('@')[0];
            try {
                const contact = await sock.getBusinessProfile(jidString);
                if (contact && contact.name) name = contact.name;
            } catch(e) {}
            return `• @${jidString.split('@')[0]}`;
        }));

        let promotedBy;
        let mentionList = participants.map(jid => {
            return typeof jid === 'string' ? jid : (jid.id || jid.toString());
        });

        if (author && author.length > 0) {
            const authorJid = typeof author === 'string' ? author : (author.id || author.toString());
            promotedBy = `@${authorJid.split('@')[0]}`;
            mentionList.push(authorJid);
        } else {
            promotedBy = 'النظام';
        }

        const promotionMessage = `╭━━━≪•👑 *تـرقـيـة مـشـرف* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃👤 *المستخدم${participants.length > 1 ? 'ات' : ''} المرفوع:*
┃${promotedUsernames.join('\n')}
┃━━━━━━━━━━━━━━━━━━━━━
┃👑 *تم الترقية بواسطة:* ${promotedBy}
┃━━━━━━━━━━━━━━━━━━━━━
┃📅 *التاريخ:* ${new Date().toLocaleString('ar-EG')}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
        
        await sock.sendMessage(groupId, {
            text: promotionMessage,
            mentions: mentionList
        });
    } catch (error) {
        console.error('خطأ في معالجة حدث الترقية:', error);
    }
}

module.exports = { promoteCommand, handlePromotionEvent };