const isAdmin = require('../lib/isAdmin');

async function demoteCommand(sock, chatId, mentionedJids, message) {
    try {
        // التحقق من أنها مجموعة
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ هذا الأمر يمكن استخدامه فقط في المجموعات!'
            }, { quoted: message });
            return;
        }

        // التحقق من صلاحيات المشرف
        try {
            const adminStatus = await isAdmin(sock, chatId, message.key.participant || message.key.remoteJid);
            
            if (!adminStatus.isBotAdmin) {
                await sock.sendMessage(chatId, { 
                    text: '❌ *خطأ:* الرجاء جعل البوت مشرفاً أولاً لاستخدام هذا الأمر.',
                    quoted: message
                });
                return;
            }

            if (!adminStatus.isSenderAdmin) {
                await sock.sendMessage(chatId, { 
                    text: '⛔ *غير مصرح!*\n👑 فقط مشرفي المجموعة يمكنهم استخدام أمر تنزيل المشرفين.',
                    quoted: message
                });
                return;
            }
        } catch (adminError) {
            console.error('خطأ في التحقق من صلاحيات المشرف:', adminError);
            await sock.sendMessage(chatId, { 
                text: '❌ *خطأ:* الرجاء التأكد من أن البوت مشرف في هذه المجموعة.',
                quoted: message
            });
            return;
        }

        // إظهار تفاعل "جاري المعالجة"
        await sock.sendMessage(chatId, {
            react: { text: '⬇️', key: message.key }
        });

        let userToDemote = [];
        
        // التحقق من وجود مستخدمين مشار إليهم
        if (mentionedJids && mentionedJids.length > 0) {
            userToDemote = mentionedJids;
        }
        // التحقق من وجود رد على رسالة
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToDemote = [message.message.extendedTextMessage.contextInfo.participant];
        }
        
        if (userToDemote.length === 0) {
            await sock.sendMessage(chatId, { 
                text: '📌 *أمر تنزيل المشرفين - JAWAD.BOT*\n\n*.نزل @مستخدم*\nأو قم بالرد على رسالة الشخص.\n\n📝 مثال:\n`.نزل @DarkXecutor`',
                quoted: message
            });
            return;
        }

        // منع تنزيل البوت نفسه
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        if (userToDemote.includes(botId)) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ *لا يمكن تنزيل البوت نفسه من المشرفين!*',
                quoted: message
            });
            return;
        }

        // تأخير لتجنب التقييد
        await new Promise(resolve => setTimeout(resolve, 1000));

        await sock.groupParticipantsUpdate(chatId, userToDemote, "demote");
        
        const usernames = await Promise.all(userToDemote.map(async jid => {
            let name = jid.split('@')[0];
            try {
                const contact = await sock.getBusinessProfile(jid);
                if (contact && contact.name) name = contact.name;
            } catch(e) {}
            return `• @${jid.split('@')[0]}`;
        }));

        await new Promise(resolve => setTimeout(resolve, 1000));

        const senderName = (message.key.participant || message.key.remoteJid).split('@')[0];
        
        const demotionMessage = `╭━━━≪•⬇️ *تـنـزيـل مـشـرف* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃👤 *المستخدم${userToDemote.length > 1 ? 'ات' : ''} المزيد:*
┃${usernames.join('\n')}
┃━━━━━━━━━━━━━━━━━━━━━
┃👑 *تم التنزيل بواسطة:* @${senderName}
┃━━━━━━━━━━━━━━━━━━━━━
┃📅 *التاريخ:* ${new Date().toLocaleString('ar-EG')}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
        
        await sock.sendMessage(chatId, { 
            text: demotionMessage,
            mentions: [...userToDemote, message.key.participant || message.key.remoteJid]
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر تنزيل المشرفين:', error);
        if (error.data === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
                await sock.sendMessage(chatId, { 
                    text: '⏳ *تم الوصول للحد الأقصى!*\n⚠️ يرجى الانتظار بضع ثوانٍ ثم المحاولة مرة أخرى.',
                    quoted: message
                });
            } catch (retryError) {
                console.error('خطأ في إرسال رسالة إعادة المحاولة:', retryError);
            }
        } else {
            try {
                await sock.sendMessage(chatId, { 
                    text: '❌ *فشل تنزيل المشرفين!*\n⚠️ تأكد من أن البوت مشرف ولديه الصلاحيات الكافية.',
                    quoted: message
                });
            } catch (sendError) {
                console.error('خطأ في إرسال رسالة الخطأ:', sendError);
            }
        }
    }
}

// دالة معالجة حدث التنزيل التلقائي
async function handleDemotionEvent(sock, groupId, participants, author) {
    try {
        if (!Array.isArray(participants) || participants.length === 0) {
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        const demotedUsernames = await Promise.all(participants.map(async jid => {
            const jidString = typeof jid === 'string' ? jid : (jid.id || jid.toString());
            let name = jidString.split('@')[0];
            try {
                const contact = await sock.getBusinessProfile(jidString);
                if (contact && contact.name) name = contact.name;
            } catch(e) {}
            return `• @${jidString.split('@')[0]}`;
        }));

        let demotedBy;
        let mentionList = participants.map(jid => {
            return typeof jid === 'string' ? jid : (jid.id || jid.toString());
        });

        if (author && author.length > 0) {
            const authorJid = typeof author === 'string' ? author : (author.id || author.toString());
            demotedBy = `@${authorJid.split('@')[0]}`;
            mentionList.push(authorJid);
        } else {
            demotedBy = 'النظام';
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        const demotionMessage = `╭━━━≪•⬇️ *تـنـزيـل مـشـرف* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃👤 *المستخدم${participants.length > 1 ? 'ات' : ''} المزيد:*
┃${demotedUsernames.join('\n')}
┃━━━━━━━━━━━━━━━━━━━━━
┃👑 *تم التنزيل بواسطة:* ${demotedBy}
┃━━━━━━━━━━━━━━━━━━━━━
┃📅 *التاريخ:* ${new Date().toLocaleString('ar-EG')}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
        
        await sock.sendMessage(groupId, {
            text: demotionMessage,
            mentions: mentionList
        });
    } catch (error) {
        console.error('خطأ في معالجة حدث التنزيل:', error);
        if (error.data === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

module.exports = { demoteCommand, handleDemotionEvent };