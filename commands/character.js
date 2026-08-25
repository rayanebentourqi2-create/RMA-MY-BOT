const axios = require('axios');
const { channelInfo } = require('../lib/messageConfig');

async function characterCommand(sock, chatId, message) {
    let userToAnalyze;
    
    // التحقق من وجود مستخدم مشار إليه
    if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        userToAnalyze = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }
    // التحقق من وجود رد على رسالة
    else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        userToAnalyze = message.message.extendedTextMessage.contextInfo.participant;
    }
    
    if (!userToAnalyze) {
        await sock.sendMessage(chatId, { 
            text: '🔮 *أمر تحليل الشخصية - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.شخصية @مستخدم` أو قم بالرد على رسالة الشخص\n\n📝 *مثال:*\n`.شخصية @DarkXecutor`\n\n✨ *سيتم تحليل شخصية المستخدم بطريقة ممتعة*',
            ...channelInfo 
        }, { quoted: message });
        return;
    }

    try {
        // إظهار تفاعل "جاري التحليل"
        await sock.sendMessage(chatId, {
            react: { text: '🔮', key: message.key }
        });

        // الحصول على الصورة الشخصية للمستخدم
        let profilePic;
        try {
            profilePic = await sock.profilePictureUrl(userToAnalyze, 'image');
        } catch {
            profilePic = 'https://i.imgur.com/2wzGhpF.jpeg'; // صورة افتراضية
        }

        // الحصول على اسم المستخدم
        let userName = userToAnalyze.split('@')[0];
        try {
            const contact = await sock.getBusinessProfile(userToAnalyze);
            if (contact && contact.name) {
                userName = contact.name;
            }
        } catch (nameError) {
            // استخدام رقم الهاتف إذا فشل جلب الاسم
        }

        // الصفات الشخصية
        const traits = [
            "ذكي", "مبدع", "مصمم", "طموح", "مهتم بالآخرين",
            "جذاب", "واثق من نفسه", "متعاطف", "نشيط", "ودود",
            "كريم", "صادق", "روح الدعابة", "خيالي", "مستقل",
            "حدسي", "لطيف", "منطقي", "مخلص", "متفائل",
            "شغوف", "صبور", "مثابر", "موثوق", "واسع الحيلة",
            "صريح", "مراعي للآخرين", "متعدد المواهب", "حكيم", "متواضع"
        ];

        // الحصول على 3-5 صفات عشوائية
        const numTraits = Math.floor(Math.random() * 3) + 3; // رقم عشوائي بين 3 و 5
        const selectedTraits = [];
        for (let i = 0; i < numTraits; i++) {
            const randomTrait = traits[Math.floor(Math.random() * traits.length)];
            if (!selectedTraits.includes(randomTrait)) {
                selectedTraits.push(randomTrait);
            }
        }

        // حساب نسب مئوية عشوائية لكل صفة
        const traitPercentages = selectedTraits.map(trait => {
            const percentage = Math.floor(Math.random() * 41) + 60; // رقم عشوائي بين 60-100
            return `┃ ✨ ${trait}: ${percentage}%`;
        });

        // تحديد أيقونة الرقم حسب التقييم
        let ratingIcon = '⭐';
        const rating = Math.floor(Math.random() * 21) + 80;
        if (rating >= 95) ratingIcon = '🌟🌟🌟🌟🌟';
        else if (rating >= 85) ratingIcon = '🌟🌟🌟🌟';
        else if (rating >= 75) ratingIcon = '🌟🌟🌟';
        else ratingIcon = '🌟🌟';

        // إنشاء رسالة تحليل الشخصية
        const analysis = `╭━━━≪•🔮 *تـحـلـيـل الـشـخـصـيـة* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃👤 *المستخدم:* ${userName}
┃━━━━━━━━━━━━━━━━━━━━━
┃✨ *الصفات الشخصية:*
${traitPercentages.join('\n')}
┃━━━━━━━━━━━━━━━━━━━━━
┃🎯 *التقييم العام:* ${rating}% ${ratingIcon}
┃━━━━━━━━━━━━━━━━━━━━━
┃💡 *ملاحظة:* هذا تحليل ترفيهي وليس دقيقاً!
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        // إرسال التحليل مع الصورة الشخصية
        await sock.sendMessage(chatId, {
            image: { url: profilePic },
            caption: analysis,
            mentions: [userToAnalyze],
            ...channelInfo
        });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر تحليل الشخصية:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ *حدث خطأ!*\n⚠️ تعذر تحليل الشخصية. يرجى المحاولة لاحقاً.',
            ...channelInfo 
        }, { quoted: message });
    }
}

module.exports = characterCommand;