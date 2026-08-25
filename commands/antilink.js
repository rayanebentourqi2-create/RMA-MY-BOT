const { bots } = require('../lib/antilink');
const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');
const isAdmin = require('../lib/isAdmin');

async function handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message) {
    try {
        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '⛔ *فقط مشرفي المجموعة يمكنهم استخدام هذا الأمر!*' }, { quoted: message });
            return;
        }

        const prefix = '.';
        const args = userMessage.slice(9).toLowerCase().trim().split(' ');
        const action = args[0];

        if (!action) {
            const usage = `🛡️ *مكافحة الروابط - JAWAD.BOT*\n\n📌 *الأوامر:*\n${prefix}منع الروابط تفعيل\n${prefix}منع الروابط اجراء حذف | طرد | تحذير\n${prefix}منع الروابط تعطيل\n${prefix}منع الروابط حالة\n\n✨ *سيتم منع الروابط في المجموعة*`;
            await sock.sendMessage(chatId, { text: usage }, { quoted: message });
            return;
        }

        switch (action) {
            case 'on':
            case 'تفعيل':
                const existingConfig = await getAntilink(chatId, 'on');
                if (existingConfig?.enabled) {
                    await sock.sendMessage(chatId, { text: '⚠️ *مكافحة الروابط مفعلة بالفعل!*' }, { quoted: message });
                    return;
                }
                const result = await setAntilink(chatId, 'on', 'حذف');
                await sock.sendMessage(chatId, { 
                    text: result ? '✅ *تم تفعيل مكافحة الروابط!*' : '❌ *فشل في تفعيل مكافحة الروابط!*' 
                }, { quoted: message });
                break;

            case 'off':
            case 'تعطيل':
                await removeAntilink(chatId, 'on');
                await sock.sendMessage(chatId, { text: '✅ *تم تعطيل مكافحة الروابط!*' }, { quoted: message });
                break;

            case 'set':
            case 'action':
            case 'اجراء':
                if (args.length < 2) {
                    await sock.sendMessage(chatId, { 
                        text: `📌 *يرجى تحديد الإجراء:* ${prefix}منع الروابط اجراء حذف | طرد | تحذير` 
                    }, { quoted: message });
                    return;
                }
                let setAction = args[1];
                // ترجمة الإجراءات العربية
                if (setAction === 'حذف') setAction = 'delete';
                if (setAction === 'طرد') setAction = 'kick';
                if (setAction === 'تحذير') setAction = 'warn';
                
                if (!['delete', 'kick', 'warn'].includes(setAction)) {
                    await sock.sendMessage(chatId, { 
                        text: '❌ *إجراء غير صالح!*\n📌 اختر: حذف، طرد، أو تحذير' 
                    }, { quoted: message });
                    return;
                }
                const setResult = await setAntilink(chatId, 'on', setAction);
                const actionText = setAction === 'delete' ? 'حذف' : (setAction === 'kick' ? 'طرد' : 'تحذير');
                await sock.sendMessage(chatId, { 
                    text: setResult ? `✅ *تم تعيين إجراء مكافحة الروابط إلى: ${actionText}*` : '❌ *فشل في تعيين الإجراء!*' 
                }, { quoted: message });
                break;

            case 'status':
            case 'حالة':
                const status = await getAntilink(chatId, 'on');
                const actionConfig = await getAntilink(chatId, 'on');
                const statusText = status?.enabled ? '🟢 مفعل' : '🔴 معطل';
                const actionTextConfig = actionConfig?.action === 'delete' ? 'حذف' : (actionConfig?.action === 'kick' ? 'طرد' : (actionConfig?.action === 'warn' ? 'تحذير' : 'غير محدد'));
                await sock.sendMessage(chatId, { 
                    text: `🛡️ *إعدادات مكافحة الروابط*\n\n📌 *الحالة:* ${statusText}\n⚙️ *الإجراء:* ${actionTextConfig}\n\n💡 *الروابط المخالفة سيتم ${actionTextConfig === 'حذف' ? 'حذفها' : (actionTextConfig === 'طرد' ? 'طرد مرسلها' : 'تحذير مرسلها')}*` 
                }, { quoted: message });
                break;

            default:
                await sock.sendMessage(chatId, { text: `❌ *أمر غير صالح!*\n📌 استخدم ${prefix}منع الروابط لمعرفة الأوامر المتاحة.` });
        }
    } catch (error) {
        console.error('خطأ في أمر مكافحة الروابط:', error);
        await sock.sendMessage(chatId, { text: '❌ *حدث خطأ أثناء معالجة الأمر!*' });
    }
}

async function handleLinkDetection(sock, chatId, message, userMessage, senderId) {
    try {
        const antilinkSetting = await getAntilink(chatId, 'on');
        if (!antilinkSetting?.enabled) return;

        const action = antilinkSetting.action || 'delete';
        
        // أنماط الروابط
        const linkPatterns = {
            whatsappGroup: /chat\.whatsapp\.com\/[A-Za-z0-9]{20,}/i,
            whatsappChannel: /whatsapp\.com\/channel\/[A-Za-z0-9]{20,}/i,
            telegram: /t\.me\/[A-Za-z0-9_]+/i,
            allLinks: /https?:\/\/\S+|www\.\S+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/i,
        };

        let hasLink = false;
        
        // التحقق من وجود رابط حسب الإعدادات
        if (linkPatterns.allLinks.test(userMessage)) {
            hasLink = true;
        }

        if (!hasLink) return;

        // التحقق من صلاحيات البوت
        const groupMetadata = await sock.groupMetadata(chatId);
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const bot = groupMetadata.participants.find(p => p.id === botId);
        if (!bot?.admin) return;

        // التحقق من صلاحيات المرسل
        const participant = groupMetadata.participants.find(p => p.id === senderId);
        if (participant?.admin) return;

        // حذف الرسالة
        try {
            await sock.sendMessage(chatId, {
                delete: { remoteJid: chatId, fromMe: false, id: message.key.id, participant: senderId },
            });
            console.log(`✅ تم حذف رسالة فيها رابط من ${senderId}`);
        } catch (error) {
            console.error('❌ فشل حذف الرسالة:', error);
        }

        const userName = senderId.split('@')[0];
        
        // الإجراء حسب الإعدادات
        switch (action) {
            case 'delete':
                await sock.sendMessage(chatId, { 
                    text: `╭━━━≪•🛡️ *مـنـع الـروابـط* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃⚠️ *@${userName} الروابط غير مسموح بها!*
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`, 
                    mentions: [senderId] 
                });
                break;

            case 'kick':
                try {
                    await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                    await sock.sendMessage(chatId, {
                        text: `╭━━━≪•🛡️ *مـنـع الـروابـط* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🚫 *@${userName} تم طرده لإرسال روابط!*
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`,
                        mentions: [senderId]
                    });
                } catch (error) {
                    console.error('خطأ في طرد المستخدم:', error);
                }
                break;

            case 'warn':
                const { incrementWarningCount, resetWarningCount } = require('../lib/index');
                const WARN_COUNT = 3;
                const warningCount = await incrementWarningCount(chatId, senderId);
                
                if (warningCount >= WARN_COUNT) {
                    try {
                        await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                        await resetWarningCount(chatId, senderId);
                        await sock.sendMessage(chatId, {
                            text: `╭━━━≪•🛡️ *مـنـع الـروابـط* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🚫 *@${userName} تم طرده بعد ${WARN_COUNT} تحذيرات!*
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`,
                            mentions: [senderId]
                        });
                    } catch (error) {
                        console.error('خطأ في طرد المستخدم:', error);
                    }
                } else {
                    await sock.sendMessage(chatId, {
                        text: `╭━━━≪•🛡️ *مـنـع الـروابـط* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃⚠️ *@${userName} تحذير ${warningCount}/${WARN_COUNT} لإرسال روابط!*
┃━━━━━━━━━━━━━━━━━━━━━
┃💡 *تجنب إرسال الروابط لتجنب الطرد*
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`,
                        mentions: [senderId]
                    });
                }
                break;
        }
    } catch (error) {
        console.error('خطأ في كشف الروابط:', error);
    }
}

module.exports = {
    handleAntilinkCommand,
    handleLinkDetection,
};