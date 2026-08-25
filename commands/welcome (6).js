const { handleWelcome } = require('../lib/welcome');
const { isWelcomeOn, getWelcome } = require('../lib/index');
const { channelInfo } = require('../lib/messageConfig');
const fetch = require('node-fetch');

async function welcomeCommand(sock, chatId, message, match) {
    // التحقق من أن الأمر يستخدم في مجموعة
    if (!chatId.endsWith('@g.us')) {
        await sock.sendMessage(chatId, { text: '⚠️ هذا الأمر يمكن استخدامه فقط في المجموعات.' });
        return;
    }

    // استخراج النص من الأمر
    const text = message.message?.conversation || 
                message.message?.extendedTextMessage?.text || '';
    const matchText = text.split(' ').slice(1).join(' ');

    await handleWelcome(sock, chatId, message, matchText);
}

async function handleJoinEvent(sock, id, participants) {
    // التحقق من تفعيل الترحيب لهذه المجموعة
    const isWelcomeEnabled = await isWelcomeOn(id);
    if (!isWelcomeEnabled) return;

    // الحصول على رسالة الترحيب المخصصة
    const customMessage = await getWelcome(id);

    // الحصول على معلومات المجموعة
    const groupMetadata = await sock.groupMetadata(id);
    const groupName = groupMetadata.subject;
    const groupDesc = groupMetadata.desc || 'لا يوجد وصف للمجموعة';

    // إرسال رسالة ترحيب لكل عضو جديد
    for (const participant of participants) {
        try {
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
                    .replace(/{group}/g, groupName)
                    .replace(/{description}/g, groupDesc);
            } else {
                // الرسالة الافتراضية
                const now = new Date();
                const timeString = now.toLocaleString('ar-EG', {
                    hour12: true,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                
                finalMessage = `╭━━━≪•🌟 𝙹𝙰𝚆𝙰𝙳.𝙱𝙾𝚃 •≫━━━╮\n┃━━━━━━━━━━━━━━━━━\n┃ 🎉 *مرحباً بك* @${displayName}\n┃━━━━━━━━━━━━━━━━━\n┃ 👥 *عدد الأعضاء:* ${groupMetadata.participants.length}\n┃ ⏰ *الوقت:* ${timeString}\n┃━━━━━━━━━━━━━━━━━\n╰━━━━━━━━━━━━━━━━━╯\n\n*🌸 أهلاً بك @${displayName} في مجموعة ${groupName}*\n\n📝 *وصف المجموعة:*\n${groupDesc}\n\n━━━━━━━━━━━━━━━━━━━━━\n> 🤖 *𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙹𝙰𝚆𝙰𝙳.𝙱𝙾𝚃*`;
            }
            
            // محاولة إرسال صورة ترحيب أولاً
            try {
                // الحصول على صورة المستخدم الشخصية
                let profilePicUrl = `https://i.postimg.cc/vBSCPzQ7/IMG-20260503-WA0000-removebg-preview.png`;
                try {
                    const profilePic = await sock.profilePictureUrl(participantString, 'image');
                    if (profilePic) {
                        profilePicUrl = profilePic;
                    }
                } catch (profileError) {
                    console.log('تعذر جلب الصورة الشخصية، سيتم استخدام الصورة الافتراضية');
                }
                
                // إنشاء رابط API لصورة الترحيب
                const apiUrl = `https://api.some-random-api.com/welcome/img/2/gaming3?type=join&textcolor=green&username=${encodeURIComponent(displayName)}&guildName=${encodeURIComponent(groupName)}&memberCount=${groupMetadata.participants.length}&avatar=${encodeURIComponent(profilePicUrl)}`;
                
                const response = await fetch(apiUrl);
                if (response.ok) {
                    const imageBuffer = await response.buffer();
                    
                    await sock.sendMessage(id, {
                        image: imageBuffer,
                        caption: finalMessage,
                        mentions: [participantString],
                        ...channelInfo
                    });
                    continue;
                }
            } catch (imageError) {
                console.log('فشل إنشاء صورة الترحيب، سيتم إرسال نص فقط');
            }
            
            // إرسال رسالة نصية
            await sock.sendMessage(id, {
                text: finalMessage,
                mentions: [participantString],
                ...channelInfo
            });
        } catch (error) {
            console.error('خطأ في إرسال رسالة الترحيب:', error);
            const participantString = typeof participant === 'string' ? participant : (participant.id || participant.toString());
            const user = participantString.split('@')[0];
            
            let fallbackMessage;
            if (customMessage) {
                fallbackMessage = customMessage
                    .replace(/{user}/g, `@${user}`)
                    .replace(/{group}/g, groupName)
                    .replace(/{description}/g, groupDesc);
            } else {
                fallbackMessage = `🎉 مرحباً @${user} في مجموعة ${groupName}!`;
            }
            
            await sock.sendMessage(id, {
                text: fallbackMessage,
                mentions: [participantString],
                ...channelInfo
            });
        }
    }
}

module.exports = { welcomeCommand, handleJoinEvent };