const { handleGoodbye } = require('../lib/welcome');
const { isGoodByeOn, getGoodbye } = require('../lib/index');
const fetch = require('node-fetch');

async function goodbyeCommand(sock, chatId, message, match) {
    // التحقق من أنها مجموعة
    if (!chatId.endsWith('@g.us')) {
        await sock.sendMessage(chatId, { 
            text: '⚠️ هذا الأمر يمكن استخدامه فقط في المجموعات.' 
        }, { quoted: message });
        return;
    }

    // استخراج النص من الأمر
    const text = message.message?.conversation || 
                message.message?.extendedTextMessage?.text || '';
    const matchText = text.split(' ').slice(1).join(' ');

    await handleGoodbye(sock, chatId, message, matchText);
}

async function handleLeaveEvent(sock, id, participants) {
    // التحقق من تفعيل رسالة الوداع لهذه المجموعة
    const isGoodbyeEnabled = await isGoodByeOn(id);
    if (!isGoodbyeEnabled) return;

    // الحصول على رسالة الوداع المخصصة
    const customMessage = await getGoodbye(id);

    // الحصول على معلومات المجموعة
    const groupMetadata = await sock.groupMetadata(id);
    const groupName = groupMetadata.subject;

    // إرسال رسالة وداع لكل عضو مغادر
    for (const participant of participants) {
        try {
            // معالجة البيانات
            const participantString = typeof participant === 'string' ? participant : (participant.id || participant.toString());
            const user = participantString.split('@')[0];
            
            // الحصول على اسم العرض للمستخدم
            let displayName = user;
            try {
                const contact = await sock.getBusinessProfile(participantString);
                if (contact && contact.name) {
                    displayName = contact.name;
                } else {
                    const groupParticipants = groupMetadata.participants;
                    const userParticipant = groupParticipants.find(p => p.id === participantString);
                    if (userParticipant && userParticipant.name) {
                        displayName = userParticipant.name;
                    }
                }
            } catch (nameError) {
                console.log('تعذر جلب الاسم، سيتم استخدام رقم الهاتف');
            }
            
            // معالجة الرسالة المخصصة مع المتغيرات
            let finalMessage;
            if (customMessage) {
                finalMessage = customMessage
                    .replace(/{user}/g, `@${displayName}`)
                    .replace(/{group}/g, groupName);
            } else {
                // الرسالة الافتراضية
                finalMessage = `╭━━━≪•👋 *وداعـاً* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃😢 *@${displayName}*
┃━━━━━━━━━━━━━━━━━━━━━
┃✨ نتمنى لك التوفيق أينما ذهبت!
┃👥 كنا سعداء بوجودك معنا في *${groupName}*
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
            }
            
            // محاولة إرسال صورة وداع أولاً
            try {
                // الحصول على الصورة الشخصية للمستخدم
                let profilePicUrl = `https://i.imgur.com/2wzGhpF.jpeg`;
                try {
                    const profilePic = await sock.profilePictureUrl(participantString, 'image');
                    if (profilePic) {
                        profilePicUrl = profilePic;
                    }
                } catch (profileError) {
                    console.log('تعذر جلب الصورة الشخصية، سيتم استخدام الصورة الافتراضية');
                }
                
                // إنشاء رابط API لصورة الوداع
                const apiUrl = `https://api.some-random-api.com/welcome/img/2/gaming1?type=leave&textcolor=red&username=${encodeURIComponent(displayName)}&guildName=${encodeURIComponent(groupName)}&memberCount=${groupMetadata.participants.length}&avatar=${encodeURIComponent(profilePicUrl)}`;
                
                const response = await fetch(apiUrl);
                if (response.ok) {
                    const imageBuffer = await response.buffer();
                    
                    await sock.sendMessage(id, {
                        image: imageBuffer,
                        caption: finalMessage,
                        mentions: [participantString]
                    });
                    continue;
                }
            } catch (imageError) {
                console.log('فشل إنشاء صورة الوداع، سيتم إرسال نص فقط');
            }
            
            // إرسال رسالة نصية
            await sock.sendMessage(id, {
                text: finalMessage,
                mentions: [participantString]
            });
        } catch (error) {
            console.error('خطأ في إرسال رسالة الوداع:', error);
            // رسالة نصية بديلة
            const participantString = typeof participant === 'string' ? participant : (participant.id || participant.toString());
            const user = participantString.split('@')[0];
            
            let fallbackMessage;
            if (customMessage) {
                fallbackMessage = customMessage
                    .replace(/{user}/g, `@${user}`)
                    .replace(/{group}/g, groupName);
            } else {
                fallbackMessage = `👋 وداعاً @${user}، نتمنى لك التوفيق!`;
            }
            
            await sock.sendMessage(id, {
                text: fallbackMessage,
                mentions: [participantString]
            });
        }
    }
}

module.exports = { goodbyeCommand, handleLeaveEvent };