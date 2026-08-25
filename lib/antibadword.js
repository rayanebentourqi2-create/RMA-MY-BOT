const { setAntiBadword, getAntiBadword, removeAntiBadword, incrementWarningCount, resetWarningCount } = require('../lib/index');
const fs = require('fs');
const path = require('path');

// تحميل إعدادات مكافحة الكلمات السيئة
function loadAntibadwordConfig(groupId) {
    try {
        const configPath = path.join(__dirname, '../data/userGroupData.json');
        if (!fs.existsSync(configPath)) {
            return {};
        }
        const data = JSON.parse(fs.readFileSync(configPath));
        return data.antibadword?.[groupId] || {};
    } catch (error) {
        console.error('❌ خطأ في تحميل إعدادات منع الكلمات:', error.message);
        return {};
    }
}

async function handleAntiBadwordCommand(sock, chatId, message, match) {
    if (!match) {
        return sock.sendMessage(chatId, {
            text: `*🛡️ منع الكلمات السيئة - JAWAD.BOT*\n\n📌 *الأوامر:*\n*.منع الكلمات تفعيل* - تفعيل الخاصية\n*.منع الكلمات تعطيل* - تعطيل الخاصية\n*.منع الكلمات اجراء حذف* - حذف الرسالة فقط\n*.منع الكلمات اجراء طرد* - طرد المخالف\n*.منع الكلمات اجراء تحذير* - تحذير المخالف\n\n✨ *سيتم حماية مجموعتك من الكلمات السيئة*`
        }, { quoted: message });
    }

    if (match === 'on' || match === 'تفعيل') {
        const existingConfig = await getAntiBadword(chatId, 'on');
        if (existingConfig?.enabled) {
            return sock.sendMessage(chatId, { text: '✅ *منع الكلمات السيئة مفعل بالفعل في هذه المجموعة*' });
        }
        await setAntiBadword(chatId, 'on', 'حذف');
        return sock.sendMessage(chatId, { text: '🛡️ *تم تفعيل منع الكلمات السيئة*\n📌 استخدم .منع الكلمات اجراء <نوع> لتخصيص الإجراء' }, { quoted: message });
    }

    if (match === 'off' || match === 'تعطيل') {
        const config = await getAntiBadword(chatId, 'on');
        if (!config?.enabled) {
            return sock.sendMessage(chatId, { text: '❌ *منع الكلمات السيئة معطل بالفعل في هذه المجموعة*' }, { quoted: message });
        }
        await removeAntiBadword(chatId);
        return sock.sendMessage(chatId, { text: '🛡️ *تم تعطيل منع الكلمات السيئة في هذه المجموعة*' }, { quoted: message });
    }

    if (match.startsWith('set') || match.startsWith('action') || match.startsWith('اجراء')) {
        const parts = match.split(' ');
        const action = parts[1];
        if (!action || !['حذف', 'delete', 'طرد', 'kick', 'تحذير', 'warn'].includes(action)) {
            return sock.sendMessage(chatId, { text: '❌ *إجراء غير صالح!*\n📌 اختر: حذف، طرد، أو تحذير' }, { quoted: message });
        }
        
        let actionType = 'حذف';
        if (action === 'طرد' || action === 'kick') actionType = 'طرد';
        else if (action === 'تحذير' || action === 'warn') actionType = 'تحذير';
        else actionType = 'حذف';
        
        await setAntiBadword(chatId, 'on', actionType);
        return sock.sendMessage(chatId, { text: `🛡️ *تم تعيين إجراء منع الكلمات إلى: ${actionType}*` }, { quoted: message });
    }

    return sock.sendMessage(chatId, { text: '❌ *أمر غير صالح!*\n📌 استخدم .منع الكلمات لمعرفة الاستخدام الصحيح' }, { quoted: message });
}

async function handleBadwordDetection(sock, chatId, message, userMessage, senderId) {
    const config = loadAntibadwordConfig(chatId);
    if (!config.enabled) return;

    // تخطي إذا لم تكن مجموعة
    if (!chatId.endsWith('@g.us')) return;

    // تخطي إذا كانت الرسالة من البوت
    if (message.key.fromMe) return;

    // الحصول على إعدادات منع الكلمات
    const antiBadwordConfig = await getAntiBadword(chatId, 'on');
    if (!antiBadwordConfig?.enabled) {
        return;
    }

    // تنظيف الرسالة
    const cleanMessage = userMessage.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // قائمة الكلمات السيئة
    const badWords = [
        // كلمات عربية
        'ابن القحبة', 'ابن الكلب', 'احا', 'احيه', 'ارهابي', 'اعور', 'بعبص', 'بوريف', 'بياع',
        'تتناك', 'تع健康的', 'تكلب', 'تلحس', 'تني', 'ثيران', 'جبان', 'جحش', 'جربوع',
        'جربوعه', 'حاقد', 'حبة', 'حثالة', 'حمار', 'حمير', 'حيوان', 'خاين', 'خنزير',
        'خول', 'دين', 'راس', 'رخيص', 'زبالة', 'زنديق', 'سافل', 'سب', 'سخيف', 'سفيه',
        'سفيلة', 'سكس', 'سيكس', 'شرموط', 'شرموطة', 'شرمطه', 'شواذ', 'شواذ جنسيا', 'شواذ جنسيين',
        'صرم', 'ضال', 'ضالين', 'ضبيع', 'ضرب', 'عاهر', 'عار', 'عاهره', 'علقة', 'علوقية',
        'عنصري', 'غبي', 'غبيه', 'غبية', 'غشيم', 'فحل', 'قذر', 'قذارة', 'كلب', 'كلبة',
        'كوس', 'كوس امك', 'كوس اختك', 'لحس', 'لحسة', 'لحسه', 'لحوس', 'مرتو', 'مسخ', 'مسطول',
        'مص', 'مص بز', 'مص بزاز', 'مص بزازي', 'مص بزازيي', 'مص راس', 'مص راسي', 'مص زب',
        'مص زبي', 'مص زبيري', 'مص قضيب', 'مص قضيبي', 'مصي', 'مك', 'ملعون', 'منيوك',
        'منيوكة', 'منيوكه', 'منييك', 'منييكة', 'منييكه', 'ناب', 'نابها', 'نابهم', 'ناك',
        'نايك', 'نت', 'نتر', 'نضح', 'نيك', 'نيوك', 'هبل', 'هرم', 'هرمية', 'همج', 'همجية',
        'وسخ', 'وسخة', 'وسخه', 'وغد', 'ولد العاهر', 'ولد العاهرة', 'ولد الشرموطة', 'يبض',
        'يتبعبص', 'يتبعبصو', 'يتناك', 'يتناكو', 'يتني', 'يتنيو', 'يتنيوك', 'يتنيوكو', 'يتنياك',
        'يتنياكو', 'يتنييك', 'يتنييكو', 'يزمر', 'يسب', 'يسكس', 'يضرب', 'يضربها', 'يضربهم',
        'يضربهمو', 'يع', 'يفسد', 'يقرف', 'ين', 'يناك', 'يناكو', 'ينبح', 'ينيك', 'ينيكو',
        
        // كلمات إنجليزية شائعة
        'fuck', 'fucker', 'fucking', 'bitch', 'shit', 'asshole', 'bastard', 'dick',
        'pussy', 'cunt', 'whore', 'slut', 'motherfucker', 'nigga', 'nigger'
    ];

    // تقسيم الرسالة إلى كلمات
    const messageWords = cleanMessage.split(' ');
    let containsBadWord = false;
    let detectedWord = '';

    // التحقق من وجود كلمات سيئة
    for (const word of messageWords) {
        if (word.length < 2) continue;

        if (badWords.includes(word)) {
            containsBadWord = true;
            detectedWord = word;
            break;
        }

        for (const badWord of badWords) {
            if (badWord.includes(' ') && cleanMessage.includes(badWord)) {
                containsBadWord = true;
                detectedWord = badWord;
                break;
            }
        }
        if (containsBadWord) break;
    }

    if (!containsBadWord) return;

    // التحقق من صلاحيات البوت
    const groupMetadata = await sock.groupMetadata(chatId);
    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const bot = groupMetadata.participants.find(p => p.id === botId);
    if (!bot?.admin) {
        return;
    }

    // التحقق إذا كان المرسل مشرفاً
    const participant = groupMetadata.participants.find(p => p.id === senderId);
    if (participant?.admin) {
        return;
    }

    // حذف الرسالة فوراً
    try {
        await sock.sendMessage(chatId, { 
            delete: message.key
        });
    } catch (err) {
        console.error('خطأ في حذف الرسالة:', err);
        return;
    }

    // الإجراء حسب الإعدادات
    const action = antiBadwordConfig.action || 'حذف';
    const userName = senderId.split('@')[0];

    switch (action) {
        case 'حذف':
        case 'delete':
            await sock.sendMessage(chatId, {
                text: `╭━━━≪•🛡️ *تـنـبـيـه* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃⚠️ *@${userName} الكلمات السيئة ممنوعة!*
┃📝 الكلمة: ${detectedWord}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`,
                mentions: [senderId]
            });
            break;

        case 'طرد':
        case 'kick':
            try {
                await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                await sock.sendMessage(chatId, {
                    text: `╭━━━≪•🛡️ *طـرد* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🚫 *@${userName} تم طرده لاستخدام كلمات سيئة!*
┃📝 الكلمة: ${detectedWord}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`,
                    mentions: [senderId]
                });
            } catch (error) {
                console.error('خطأ في طرد المستخدم:', error);
            }
            break;

        case 'تحذير':
        case 'warn':
            const warningCount = await incrementWarningCount(chatId, senderId);
            if (warningCount >= 3) {
                try {
                    await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                    await resetWarningCount(chatId, senderId);
                    await sock.sendMessage(chatId, {
                        text: `╭━━━≪•🛡️ *طـرد بـعـد 3 تـحـذيـرات* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🚫 *@${userName} تم طرده بعد 3 تحذيرات!*
┃📝 الكلمة: ${detectedWord}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`,
                        mentions: [senderId]
                    });
                } catch (error) {
                    console.error('خطأ في طرد المستخدم:', error);
                }
            } else {
                await sock.sendMessage(chatId, {
                    text: `╭━━━≪•🛡️ *تـحـذيـر* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃⚠️ *@${userName} تحذير ${warningCount}/3*
┃📝 الكلمة: ${detectedWord}
┃━━━━━━━━━━━━━━━━━━━━━
┃💡 *تجنب الكلمات السيئة لتجنب الطرد*
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`,
                    mentions: [senderId]
                });
            }
            break;
    }
}

module.exports = {
    handleAntiBadwordCommand,
    handleBadwordDetection
};