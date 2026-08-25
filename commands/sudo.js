const settings = require('../settings');
const { addSudo, removeSudo, getSudoList } = require('../lib/index');
const isOwnerOrSudo = require('../lib/isOwner');

// دالة استخراج المعرف المشار إليه
function extractMentionedJid(message) {
    const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentioned.length > 0) return mentioned[0];
    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const match = text.match(/\b(\d{7,15})\b/);
    if (match) return match[1] + '@s.whatsapp.net';
    return null;
}

async function sudoCommand(sock, chatId, message) {
    try {
        const senderJid = message.key.participant || message.key.remoteJid;
        const isOwner = message.key.fromMe || await isOwnerOrSudo(senderJid, sock, chatId);

        const rawText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const args = rawText.trim().split(' ').slice(1);
        const sub = (args[0] || '').toLowerCase();

        // عرض المساعدة
        if (!sub || !['add', 'del', 'remove', 'list', 'اضافة', 'حذف', 'قائمة'].includes(sub)) {
            await sock.sendMessage(chatId, { 
                text: `👑 *أمر المستخدمين الخاصين - JAWAD.BOT*\n\n📌 *الاستخدام:*\n• .sudo اضافة @مستخدم - إضافة مستخدم خاص\n• .sudo حذف @مستخدم - حذف مستخدم خاص\n• .sudo قائمة - عرض قائمة المستخدمين الخاصين\n\n📝 *أمثلة:*\n.sudo اضافة @DarkXecutor\n.sudo حذف @user\n.sudo قائمة\n\n✨ *المستخدم الخاص يمكنه استخدام أوامر المطور*`
            }, { quoted: message });
            return;
        }

        // عرض قائمة المستخدمين الخاصين
        if (sub === 'list' || sub === 'قائمة') {
            const list = await getSudoList();
            if (list.length === 0) {
                await sock.sendMessage(chatId, { 
                    text: '📋 *لا يوجد مستخدمين خاصين!*\n✨ استخدم .sudo اضافة @مستخدم لإضافة مستخدم.'
                }, { quoted: message });
                return;
            }
            
            const formattedList = list.map((j, i) => {
                const num = j.split('@')[0];
                return `${i + 1}. @${num}`;
            }).join('\n');
            
            const text = `╭━━━≪•👑 *الـمـسـتـخـدمـيـن الـخـاصـيـن* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃📋 *القائمة (${list.length}):*
┃━━━━━━━━━━━━━━━━━━━━━
${formattedList}
┃━━━━━━━━━━━━━━━━━━━━━
┃💡 *يمكن لهؤلاء المستخدمين استخدام أوامر المطور*
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
            
            await sock.sendMessage(chatId, { 
                text, 
                mentions: list 
            }, { quoted: message });
            return;
        }

        // التحقق من صلاحيات المستخدم (لإضافة/حذف)
        if (!isOwner) {
            await sock.sendMessage(chatId, { 
                text: '⛔ *غير مصرح!*\n👑 فقط مطور البوت يمكنه إضافة أو حذف المستخدمين الخاصين.\n📋 استخدم .sudo قائمة لعرض المستخدمين الحاليين.'
            }, { quoted: message });
            return;
        }

        // استخراج المستخدم المستهدف
        const targetJid = extractMentionedJid(message);
        if (!targetJid) {
            await sock.sendMessage(chatId, { 
                text: '❌ *خطأ!*\n📌 يرجى الإشارة إلى المستخدم أو إدخال رقم الهاتف.\n📝 مثال: .sudo اضافة @DarkXecutor'
            }, { quoted: message });
            return;
        }

        const targetName = targetJid.split('@')[0];

        // إضافة مستخدم خاص
        if (sub === 'add' || sub === 'اضافة') {
            // التحقق من إضافة المطور نفسه
            const ownerJid = settings.ownerNumber + '@s.whatsapp.net';
            if (targetJid === ownerJid) {
                await sock.sendMessage(chatId, { 
                    text: '👑 *المطور لا يمكن إضافته!*\n✨ المطور هو المالك الأساسي للبوت.'
                }, { quoted: message });
                return;
            }
            
            const ok = await addSudo(targetJid);
            if (ok) {
                await sock.sendMessage(chatId, { 
                    text: `✅ *تمت الإضافة بنجاح!*\n👑 المستخدم @${targetName} أصبح الآن مستخدماً خاصاً.\n✨ يمكنه الآن استخدام أوامر المطور.`,
                    mentions: [targetJid]
                }, { quoted: message });
            } else {
                await sock.sendMessage(chatId, { 
                    text: '❌ *فشلت الإضافة!*\n⚠️ يرجى المحاولة لاحقاً.'
                }, { quoted: message });
            }
            return;
        }

        // حذف مستخدم خاص
        if (sub === 'del' || sub === 'remove' || sub === 'حذف') {
            const ownerJid = settings.ownerNumber + '@s.whatsapp.net';
            if (targetJid === ownerJid) {
                await sock.sendMessage(chatId, { 
                    text: '👑 *لا يمكن حذف المطور!*\n✨ المطور هو المالك الأساسي ولا يمكن إزالته.'
                }, { quoted: message });
                return;
            }
            
            const ok = await removeSudo(targetJid);
            if (ok) {
                await sock.sendMessage(chatId, { 
                    text: `✅ *تم الحذف بنجاح!*\n👑 تمت إزالة المستخدم @${targetName} من قائمة المستخدمين الخاصين.`,
                    mentions: [targetJid]
                }, { quoted: message });
            } else {
                await sock.sendMessage(chatId, { 
                    text: '❌ *فشل الحذف!*\n⚠️ قد لا يكون هذا المستخدم في القائمة أصلاً.'
                }, { quoted: message });
            }
            return;
        }

    } catch (error) {
        console.error('خطأ في أمر sudo:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ *حدث خطأ!*\n⚠️ تعذر معالجة الأمر. يرجى المحاولة لاحقاً.'
        }, { quoted: message });
    }
}

module.exports = sudoCommand;