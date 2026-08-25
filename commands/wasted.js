const axios = require('axios');
const { channelInfo } = require('../lib/messageConfig');

async function wastedCommand(sock, chatId, message) {
    let userToWaste;
    
    // التحقق من وجود مستخدم مشار إليه
    if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        userToWaste = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }
    // التحقق من وجود رد على رسالة
    else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        userToWaste = message.message.extendedTextMessage.contextInfo.participant;
    }
    
    if (!userToWaste) {
        await sock.sendMessage(chatId, { 
            text: '⚰️ *أمر التخلص - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.تخلص @مستخدم` أو قم بالرد على رسالة الشخص\n\n📝 *مثال:*\n`.تخلص @DarkXecutor`',
            ...channelInfo 
        }, { quoted: message });
        return;
    }

    try {
        // إظهار تفاعل "جاري المعالجة"
        await sock.sendMessage(chatId, {
            react: { text: '⚰️', key: message.key }
        });

        // الحصول على الصورة الشخصية للمستخدم
        let profilePic;
        try {
            profilePic = await sock.profilePictureUrl(userToWaste, 'image');
        } catch {
            profilePic = 'https://i.imgur.com/2wzGhpF.jpeg'; // صورة افتراضية
        }

        // الحصول على اسم المستخدم
        let userName = userToWaste.split('@')[0];
        try {
            const contact = await sock.getBusinessProfile(userToWaste);
            if (contact && contact.name) {
                userName = contact.name;
            }
        } catch (nameError) {
            // استخدام رقم الهاتف إذا فشل جلب الاسم
        }

        // الحصول على صورة تأثير "تم التخلص منه"
        const wastedResponse = await axios.get(
            `https://some-random-api.com/canvas/overlay/wasted?avatar=${encodeURIComponent(profilePic)}`,
            { responseType: 'arraybuffer' }
        );

        // إرسال الصورة
        await sock.sendMessage(chatId, {
            image: Buffer.from(wastedResponse.data),
            caption: `⚰️ *❌ تـم الـتـخـلـص مـنـه ❌* ⚰️\n\n👤 *الاسم:* ${userName}\n💀 *الحالة:* تم التخلص منه بنجاح\n\n━━━━━━━━━━━━━━━━━━━━━\n> 🤖 *JAWAD.BOT*`,
            mentions: [userToWaste],
            ...channelInfo
        });

    } catch (error) {
        console.error('خطأ في أمر التخلص:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ *حدث خطأ!*\n\nتعذر إنشاء صورة "تم التخلص منه". يرجى المحاولة لاحقاً.',
            ...channelInfo 
        }, { quoted: message });
    }
}

module.exports = wastedCommand;