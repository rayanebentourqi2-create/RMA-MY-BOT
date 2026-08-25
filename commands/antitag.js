const { setAntitag, getAntitag, removeAntitag } = require('../lib/index');
const isAdmin = require('../lib/isAdmin');

async function handleAntitagCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message) {
    try {
        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '⛔ *فقط مشرفي المجموعة يمكنهم استخدام هذا الأمر!*' }, { quoted: message });
            return;
        }

        const prefix = '.';
        const args = userMessage.slice(9).toLowerCase().trim().split(' ');
        const action = args[0];

        if (!action) {
            const usage = `🛡️ *مكافحة منشن الجميع - JAWAD.BOT*\n\n📌 *الأوامر:*\n${prefix}منع التاغ تفعيل\n${prefix}منع التاغ اجراء حذف | طرد\n${prefix}منع التاغ تعطيل\n${prefix}منع التاغ حالة\n\n✨ *سيتم منع منشن الجميع في المجموعة*`;
            await sock.sendMessage(chatId, { text: usage }, { quoted: message });
            return;
        }

        switch (action) {
            case 'on':
            case 'تفعيل':
                const existingConfig = await getAntitag(chatId, 'on');
                if (existingConfig?.enabled) {
                    await sock.sendMessage(chatId, { text: '⚠️ *مكافحة منشن الجميع مفعلة بالفعل!*' }, { quoted: message });
                    return;
                }
                const result = await setAntitag(chatId, 'on', 'حذف');
                await sock.sendMessage(chatId, { 
                    text: result ? '✅ *تم تفعيل مكافحة منشن الجميع!*' : '❌ *فشل في تفعيل مكافحة منشن الجميع!*' 
                }, { quoted: message });
                break;

            case 'off':
            case 'تعطيل':
                await removeAntitag(chatId, 'on');
                await sock.sendMessage(chatId, { text: '✅ *تم تعطيل مكافحة منشن الجميع!*' }, { quoted: message });
                break;

            case 'set':
            case 'action':
            case 'اجراء':
                if (args.length < 2) {
                    await sock.sendMessage(chatId, { 
                        text: `📌 *يرجى تحديد الإجراء:* ${prefix}منع التاغ اجراء حذف | طرد` 
                    }, { quoted: message });
                    return;
                }
                let setAction = args[1];
                if (setAction === 'حذف') setAction = 'delete';
                if (setAction === 'طرد') setAction = 'kick';
                
                if (!['delete', 'kick'].includes(setAction)) {
                    await sock.sendMessage(chatId, { 
                        text: '❌ *إجراء غير صالح!*\n📌 اختر: حذف أو طرد' 
                    }, { quoted: message });
                    return;
                }
                const setResult = await setAntitag(chatId, 'on', setAction);
                const actionText = setAction === 'delete' ? 'حذف' : 'طرد';
                await sock.sendMessage(chatId, { 
                    text: setResult ? `✅ *تم تعيين إجراء مكافحة منشن الجميع إلى: ${actionText}*` : '❌ *فشل في تعيين الإجراء!*' 
                }, { quoted: message });
                break;

            case 'status':
            case 'حالة':
                const status = await getAntitag(chatId, 'on');
                const statusText = status?.enabled ? '🟢 مفعل' : '🔴 معطل';
                const actionConfig = await getAntitag(chatId, 'on');
                const actionTextConfig = actionConfig?.action === 'delete' ? 'حذف' : (actionConfig?.action === 'kick' ? 'طرد' : 'غير محدد');
                await sock.sendMessage(chatId, { 
                    text: `🛡️ *إعدادات مكافحة منشن الجميع*\n\n📌 *الحالة:* ${statusText}\n⚙️ *الإجراء:* ${actionTextConfig}\n\n💡 *منشن الجميع سيتم ${actionTextConfig === 'حذف' ? 'حذفه' : 'طرد مرسله'}*` 
                }, { quoted: message });
                break;

            default:
                await sock.sendMessage(chatId, { text: `❌ *أمر غير صالح!*\n📌 استخدم ${prefix}منع التاغ لمعرفة الأوامر المتاحة.` }, { quoted: message });
        }
    } catch (error) {
        console.error('خطأ في أمر مكافحة منشن الجميع:', error);
        await sock.sendMessage(chatId, { text: '❌ *حدث خطأ أثناء معالجة الأمر!*' }, { quoted: message });
    }
}

async function handleTagDetection(sock, chatId, message, senderId) {
    try {
        const antitagSetting = await getAntitag(chatId, 'on');
        if (!antitagSetting || !antitagSetting.enabled) return;

        // الحصول على المعرفات المشار إليها من contextInfo
        const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        
        // استخراج النص من جميع أنواع الرسائل
        const messageText = (
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption ||
            ''
        );

        // البحث عن جميع @منشن في النص
        const textMentions = messageText.match(/@[\d+\s\-()~.]+/g) || [];
        const numericMentions = messageText.match(/@\d{10,}/g) || [];
        
        // دمج جميع المنشنات
        const allMentions = [...new Set([...mentionedJids, ...textMentions, ...numericMentions])];
        
        // عد المنشنات الفريدة
        const uniqueNumericMentions = new Set();
        numericMentions.forEach(mention => {
            const numMatch = mention.match(/@(\d+)/);
            if (numMatch) uniqueNumericMentions.add(numMatch[1]);
        });
        
        const mentionedJidCount = mentionedJids.length;
        const numericMentionCount = uniqueNumericMentions.size;
        const totalMentions = Math.max(mentionedJidCount, numericMentionCount);

        // التحقق من وجود منشن جماعي (3 منشنات أو أكثر)
        if (totalMentions >= 3) {
            const groupMetadata = await sock.groupMetadata(chatId);
            const participants = groupMetadata.participants || [];
            
            const mentionThreshold = Math.ceil(participants.length * 0.5);
            const hasManyNumericMentions = numericMentionCount >= 10 || 
                                          (numericMentionCount >= 5 && numericMentionCount >= mentionThreshold);
            
            if (totalMentions >= mentionThreshold || hasManyNumericMentions) {
                
                const action = antitagSetting.action || 'حذف';
                const userName = senderId.split('@')[0];
                
                if (action === 'حذف' || action === 'delete') {
                    // حذف الرسالة
                    try {
                        await sock.sendMessage(chatId, {
                            delete: {
                                remoteJid: chatId,
                                fromMe: false,
                                id: message.key.id,
                                participant: senderId
                            }
                        });
                    } catch (e) {
                        console.error('خطأ في حذف الرسالة:', e);
                    }
                    
                    // إرسال تحذير
                    await sock.sendMessage(chatId, {
                        text: `╭━━━≪•🛡️ *مـنـع مـنـشـن الـجـمـيـع* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃⚠️ *@${userName} منشن الجميع غير مسموح به!*
┃📌 تم حذف رسالتك المخالفة
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`,
                        mentions: [senderId]
                    }, { quoted: message });
                    
                } else if (action === 'طرد' || action === 'kick') {
                    // حذف الرسالة أولاً
                    try {
                        await sock.sendMessage(chatId, {
                            delete: {
                                remoteJid: chatId,
                                fromMe: false,
                                id: message.key.id,
                                participant: senderId
                            }
                        });
                    } catch (e) {
                        console.error('خطأ في حذف الرسالة:', e);
                    }

                    // طرد المستخدم
                    try {
                        await sock.groupParticipantsUpdate(chatId, [senderId], "remove");
                    } catch (e) {
                        console.error('خطأ في طرد المستخدم:', e);
                    }

                    // إرسال إشعار
                    await sock.sendMessage(chatId, {
                        text: `╭━━━≪•🛡️ *مـنـع مـنـشـن الـجـمـيـع* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🚫 *@${userName} تم طرده بسبب منشن الجميع!*
┃📌 منشن الجميع ممنوع في هذه المجموعة
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`,
                        mentions: [senderId]
                    }, { quoted: message });
                }
            }
        }
    } catch (error) {
        console.error('خطأ في كشف منشن الجميع:', error);
    }
}

module.exports = {
    handleAntitagCommand,
    handleTagDetection
};