const fs = require('fs');
const path = require('path');
const os = require('os');
const isOwnerOrSudo = require('../lib/isOwner');

const channelInfo = {
    contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363427092431731@newsletter',
            newsletterName: 'JAWAD.BOT',
            serverMessageId: -1
        }
    }
};

async function clearSessionCommand(sock, chatId, msg) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!msg.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { 
                text: '⛔ *غير مصرح!*\n👑 هذا الأمر متاح فقط لمطور البوت!',
                ...channelInfo
            }, { quoted: msg });
            return;
        }

        // إظهار تفاعل "جاري التنظيف"
        await sock.sendMessage(chatId, {
            react: { text: '🧹', key: msg.key }
        });

        // تحديد مجلد الجلسة
        const sessionDir = path.join(__dirname, '../session');

        if (!fs.existsSync(sessionDir)) {
            await sock.sendMessage(chatId, { 
                text: '❌ *مجلد الجلسة غير موجود!*\n⚠️ لا يوجد ملفات جلسة لتنظيفها.',
                ...channelInfo
            }, { quoted: msg });
            return;
        }

        let filesCleared = 0;
        let errors = 0;
        let errorDetails = [];

        // إرسال حالة البداية
        await sock.sendMessage(chatId, { 
            text: `🔍 *جاري تحسين ملفات الجلسة...*\n⏳ يرجى الانتظار، قد يستغرق هذا بضع ثوانٍ.`,
            ...channelInfo
        }, { quoted: msg });

        const files = fs.readdirSync(sessionDir);
        
        // حساب عدد الملفات حسب النوع للتحسين
        let appStateSyncCount = 0;
        let preKeyCount = 0;
        let credsExists = false;
        let otherFilesCount = 0;

        for (const file of files) {
            if (file.startsWith('app-state-sync-')) appStateSyncCount++;
            else if (file.startsWith('pre-key-')) preKeyCount++;
            else if (file === 'creds.json') credsExists = true;
            else otherFilesCount++;
        }

        // حذف الملفات (مع الاحتفاظ بـ creds.json)
        for (const file of files) {
            if (file === 'creds.json') {
                // تخطي ملف creds.json (بيانات تسجيل الدخول)
                continue;
            }
            try {
                const filePath = path.join(sessionDir, file);
                fs.unlinkSync(filePath);
                filesCleared++;
            } catch (error) {
                errors++;
                errorDetails.push(`فشل حذف ${file}: ${error.message}`);
            }
        }

        // إرسال رسالة الإكمال
        let message = `╭━━━≪•🧹 *تـنـظـيـف مـلـفـات الـجـلـسـة* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃✅ *تم تنظيف ملفات الجلسة بنجاح!*
┃━━━━━━━━━━━━━━━━━━━━━
┃📊 *الإحصائيات:*
┃━━━━━━━━━━━━━━━━━━━━━
┃• عدد الملفات المحذوفة: ${filesCleared}
┃• ملفات حالة التطبيق: ${appStateSyncCount}
┃• ملفات المفاتيح المؤقتة: ${preKeyCount}
┃• ملفات أخرى: ${otherFilesCount}
┃━━━━━━━━━━━━━━━━━━━━━
┃🔐 *ملف creds.json:* ${credsExists ? 'تم الاحتفاظ به ✅' : 'غير موجود'}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        if (errors > 0) {
            message += `\n\n⚠️ *أخطاء:* ${errors}\n${errorDetails.slice(0, 3).join('\n')}`;
        }

        message += `\n\n💡 *ملاحظة:* سيتم إنشاء ملفات جديدة تلقائياً عند الحاجة.`;

        await sock.sendMessage(chatId, { 
            text: message,
            ...channelInfo
        }, { quoted: msg });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: msg.key }
        });

    } catch (error) {
        console.error('خطأ في أمر تنظيف الجلسة:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ *فشل تنظيف ملفات الجلسة!*\n⚠️ ' + error.message,
            ...channelInfo
        }, { quoted: msg });
    }
}

module.exports = clearSessionCommand;