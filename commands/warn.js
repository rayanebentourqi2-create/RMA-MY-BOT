const fs = require('fs');
const path = require('path');
const isAdmin = require('../lib/isAdmin');

// تحديد المسارات
const databaseDir = path.join(process.cwd(), 'data');
const warningsPath = path.join(databaseDir, 'warnings.json');

// تهيئة ملف التحذيرات
function initializeWarningsFile() {
    if (!fs.existsSync(databaseDir)) {
        fs.mkdirSync(databaseDir, { recursive: true });
    }
    
    if (!fs.existsSync(warningsPath)) {
        fs.writeFileSync(warningsPath, JSON.stringify({}), 'utf8');
    }
}

async function warnCommand(sock, chatId, senderId, mentionedJids, message) {
    try {
        initializeWarningsFile();

        // التحقق من أن الأمر يستخدم في مجموعة
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ هذا الأمر يمكن استخدامه فقط في المجموعات!'
            }, { quoted: message });
            return;
        }

        // التحقق من صلاحيات المشرف
        try {
            const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
            
            if (!isBotAdmin) {
                await sock.sendMessage(chatId, { 
                    text: '❌ خطأ: الرجاء جعل البوت مشرفاً أولاً لاستخدام هذا الأمر.'
                }, { quoted: message });
                return;
            }

            if (!isSenderAdmin) {
                await sock.sendMessage(chatId, { 
                    text: '❌ خطأ: فقط مشرفي المجموعة يمكنهم استخدام أمر التحذير.'
                }, { quoted: message });
                return;
            }
        } catch (adminError) {
            console.error('خطأ في التحقق من صلاحيات المشرف:', adminError);
            await sock.sendMessage(chatId, { 
                text: '❌ خطأ: الرجاء التأكد من أن البوت مشرف في هذه المجموعة.'
            }, { quoted: message });
            return;
        }

        let userToWarn;
        
        // التحقق من وجود مستخدم مشار إليه
        if (mentionedJids && mentionedJids.length > 0) {
            userToWarn = mentionedJids[0];
        }
        // التحقق من وجود رد على رسالة
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToWarn = message.message.extendedTextMessage.contextInfo.participant;
        }
        
        if (!userToWarn) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ *أمر التحذير - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.حذر @مستخدم سبب`\n\n📝 *مثال:*\n`.حذر @DarkXecutor مخالفة القوانين`\n\n💡 يمكنك أيضاً الرد على رسالة الشخص واستخدام `.حذر`'
            }, { quoted: message });
            return;
        }

        // تجنب التقييد
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            let warnings = {};
            try {
                warnings = JSON.parse(fs.readFileSync(warningsPath, 'utf8'));
            } catch (error) {
                warnings = {};
            }

            if (!warnings[chatId]) warnings[chatId] = {};
            if (!warnings[chatId][userToWarn]) warnings[chatId][userToWarn] = 0;
            
            warnings[chatId][userToWarn]++;
            fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));

            // استخراج سبب التحذير
            let warningReason = '';
            const commandParts = message.message?.conversation?.split(' ') || 
                               message.message?.extendedTextMessage?.text?.split(' ') || [];
            if (commandParts.length > 1) {
                warningReason = commandParts.slice(1).join(' ');
            }

            const userName = userToWarn.split('@')[0];
            const adminName = senderId.split('@')[0];
            const warningCount = warnings[chatId][userToWarn];

            // تحديد أيقونة التحذير حسب العدد
            let warningIcon = '⚠️';
            if (warningCount === 2) warningIcon = '⚠️⚠️';
            if (warningCount >= 3) warningIcon = '🔴';

            const warningMessage = `╭━━━≪•${warningIcon} *تَـحـذيـر* ${warningIcon}•≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃👤 *العضو المحذر:* @${userName}
┃⚠️ *عدد التحذيرات:* ${warningCount}/3
┃👑 *تم التحذير بواسطة:* @${adminName}
${warningReason ? `┃📝 *السبب:* ${warningReason}` : ''}
┃📅 *التاريخ:* ${new Date().toLocaleString('ar-EG')}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯

${warningCount === 1 ? '⚠️ *تنبيه:* تحذير واحد متبقي 2 تحذيرات للطرد!' : ''}
${warningCount === 2 ? '⚠️⚠️ *تنبيه:* تبقى تحذير واحد فقط قبل الطرد!' : ''}
${warningCount >= 3 ? '🔴 *تم الطرد:* تم طرد العضو تلقائياً!' : ''}`;

            await sock.sendMessage(chatId, { 
                text: warningMessage,
                mentions: [userToWarn, senderId]
            });

            // الطرد التلقائي بعد 3 تحذيرات
            if (warnings[chatId][userToWarn] >= 3) {
                await new Promise(resolve => setTimeout(resolve, 1000));

                await sock.groupParticipantsUpdate(chatId, [userToWarn], "remove");
                delete warnings[chatId][userToWarn];
                fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));
                
                const kickMessage = `╭━━━≪•🔴 *طـرد تـلقـائـي* 🔴•≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃👤 @${userName}
┃⚠️ عدد التحذيرات: 3/3
┃💢 تم طرد العضو تلقائياً
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

                await sock.sendMessage(chatId, { 
                    text: kickMessage,
                    mentions: [userToWarn]
                });
            }
        } catch (error) {
            console.error('خطأ في أمر التحذير:', error);
            await sock.sendMessage(chatId, { 
                text: '❌ فشل في تحذير العضو! يرجى المحاولة لاحقاً.'
            }, { quoted: message });
        }
    } catch (error) {
        console.error('خطأ في أمر التحذير:', error);
        if (error.data === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
                await sock.sendMessage(chatId, { 
                    text: '⏳ تم الوصول للحد الأقصى. الرجاء الانتظار بضع ثوانٍ ثم المحاولة مرة أخرى.'
                }, { quoted: message });
            } catch (retryError) {
                console.error('خطأ في إرسال رسالة إعادة المحاولة:', retryError);
            }
        } else {
            try {
                await sock.sendMessage(chatId, { 
                    text: '❌ فشل في تحذير العضو. تأكد من أن البوت مشرف ولديه الصلاحيات الكافية.'
                }, { quoted: message });
            } catch (sendError) {
                console.error('خطأ في إرسال رسالة الخطأ:', sendError);
            }
        }
    }
}

module.exports = warnCommand;