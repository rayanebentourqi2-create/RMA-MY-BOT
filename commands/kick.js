const isAdmin = require('../lib/isAdmin');

async function kickCommand(sock, chatId, senderId, mentionedJids, message) {
    try {
        const isOwner = message.key.fromMe;
        
        if (!isOwner) {
            const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

            if (!isBotAdmin) {
                await sock.sendMessage(chatId, { 
                    text: '⚠️ *الرجاء جعل البوت مشرفاً أولاً!*' 
                }, { quoted: message });
                return;
            }

            if (!isSenderAdmin) {
                await sock.sendMessage(chatId, { 
                    text: '⛔ *غير مصرح!*\n👑 فقط مشرفي المجموعة يمكنهم استخدام أمر الطرد.' 
                }, { quoted: message });
                return;
            }
        }

        // إظهار تفاعل "جاري الطرد"
        await sock.sendMessage(chatId, {
            react: { text: '👢', key: message.key }
        });

        let usersToKick = [];
        
        if (mentionedJids && mentionedJids.length > 0) {
            usersToKick = mentionedJids;
        }
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            usersToKick = [message.message.extendedTextMessage.contextInfo.participant];
        }
        
        if (usersToKick.length === 0) {
            await sock.sendMessage(chatId, { 
                text: '👢 *أمر الطرد - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.طرد @مستخدم` أو قم بالرد على رسالة الشخص\n\n📝 *مثال:*\n`.طرد @DarkXecutor`' 
            }, { quoted: message });
            return;
        }

        // منع طرد البوت نفسه
        const botId = sock.user?.id || '';
        const botLid = sock.user?.lid || '';
        const botPhoneNumber = botId.includes(':') ? botId.split(':')[0] : (botId.includes('@') ? botId.split('@')[0] : botId);
        const botIdFormatted = botPhoneNumber + '@s.whatsapp.net';
        
        const botLidNumeric = botLid.includes(':') ? botLid.split(':')[0] : (botLid.includes('@') ? botLid.split('@')[0] : botLid);
        const botLidWithoutSuffix = botLid.includes('@') ? botLid.split('@')[0] : botLid;

        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants || [];

        const isTryingToKickBot = usersToKick.some(userId => {
            const userPhoneNumber = userId.includes(':') ? userId.split(':')[0] : (userId.includes('@') ? userId.split('@')[0] : userId);
            const userLidNumeric = userId.includes('@lid') ? userId.split('@')[0].split(':')[0] : '';
            
            const directMatch = (
                userId === botId ||
                userId === botLid ||
                userId === botIdFormatted ||
                userPhoneNumber === botPhoneNumber ||
                (userLidNumeric && botLidNumeric && userLidNumeric === botLidNumeric)
            );
            
            if (directMatch) return true;
            
            const participantMatch = participants.some(p => {
                const pPhoneNumber = p.phoneNumber ? p.phoneNumber.split('@')[0] : '';
                const pId = p.id ? p.id.split('@')[0] : '';
                const pLid = p.lid ? p.lid.split('@')[0] : '';
                const pFullId = p.id || '';
                const pFullLid = p.lid || '';
                const pLidNumeric = pLid.includes(':') ? pLid.split(':')[0] : pLid;
                
                const isThisParticipantBot = (
                    pFullId === botId ||
                    pFullLid === botLid ||
                    pLidNumeric === botLidNumeric ||
                    pPhoneNumber === botPhoneNumber ||
                    pId === botPhoneNumber ||
                    p.phoneNumber === botIdFormatted ||
                    (botLid && pLid && botLidWithoutSuffix === pLid)
                );
                
                if (isThisParticipantBot) {
                    return (
                        userId === pFullId ||
                        userId === pFullLid ||
                        userPhoneNumber === pPhoneNumber ||
                        userPhoneNumber === pId ||
                        userId === p.phoneNumber ||
                        (pLid && userLidNumeric && userLidNumeric === pLidNumeric) ||
                        (userLidNumeric && pLidNumeric && userLidNumeric === pLidNumeric)
                    );
                }
                return false;
            });
            
            return participantMatch;
        });

        if (isTryingToKickBot) {
            await sock.sendMessage(chatId, { 
                text: "⚠️ *لا يمكن طرد البوت نفسه!* 🤖" 
            }, { quoted: message });
            return;
        }

        // تأخير لتجنب التقييد
        await new Promise(resolve => setTimeout(resolve, 1000));

        await sock.groupParticipantsUpdate(chatId, usersToKick, "remove");
        
        const usernames = usersToKick.map(jid => `@${jid.split('@')[0]}`);
        
        const successMessage = `╭━━━≪•👢 *طـرد* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃✅ *تم طرد ${usernames.length === 1 ? 'العضو' : 'الأعضاء'} بنجاح!*
┃━━━━━━━━━━━━━━━━━━━━━
┃👤 ${usernames.join(', ')}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
        
        await sock.sendMessage(chatId, { 
            text: successMessage,
            mentions: usersToKick
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر الطرد:', error);
        
        let errorMessage = '❌ *فشل طرد العضو!*\n⚠️ تأكد من أن البوت مشرف ولديه الصلاحيات الكافية.';
        
        if (error.message && error.message.includes('rate')) {
            errorMessage = '⏳ *تم الوصول للحد الأقصى!*\n⚠️ يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
    }
}

module.exports = kickCommand;