const fs = require('fs');
const path = require('path');

const warningsFilePath = path.join(__dirname, '../data/warnings.json');

// تحميل بيانات التحذيرات
function loadWarnings() {
    try {
        if (!fs.existsSync(warningsFilePath)) {
            fs.writeFileSync(warningsFilePath, JSON.stringify({}), 'utf8');
        }
        const data = fs.readFileSync(warningsFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('خطأ في تحميل التحذيرات:', error);
        return {};
    }
}

async function warningsCommand(sock, chatId, mentionedJidList, message) {
    // التحقق من وجود مستخدم مشار إليه
    if (mentionedJidList.length === 0) {
        await sock.sendMessage(chatId, { 
            text: '⚠️ *أمر التحذيرات - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.تحذيرات @مستخدم`\n\n📝 *مثال:*\n`.تحذيرات @DarkXecutor`\n\n👑 *للمشرفين فقط:*\n`.حذر @مستخدم سبب` - إضافة تحذير\n`.حذف تحذيرات @مستخدم` - حذف التحذيرات'
        }, { quoted: message });
        return;
    }

    const userToCheck = mentionedJidList[0];
    const warnings = loadWarnings();
    const warningCount = warnings[userToCheck] || 0;
    const userName = userToCheck.split('@')[0];

    // تحديد الشكل حسب عدد التحذيرات
    let statusEmoji = '✅';
    let statusText = 'آمن';
    
    if (warningCount === 1) {
        statusEmoji = '⚠️';
        statusText = 'تحذير واحد';
    } else if (warningCount === 2) {
        statusEmoji = '⚠️⚠️';
        statusText = 'تحذيران';
    } else if (warningCount >= 3) {
        statusEmoji = '🔴';
        statusText = 'خطر - سيتم الطرد';
    }

    const responseText = `╭━━━≪•⚠️ *التحذيرات* •≫━━━╮
┃━━━━━━━━━━━━━━━━━
┃👤 *المستخدم:* ${userName}
┃⚠️ *عدد التحذيرات:* ${warningCount}
┃${statusEmoji} *الحالة:* ${statusText}
┃━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯

${warningCount >= 3 ? '⚠️ *تنبيه:* سيتم طرد هذا المستخدم إذا تلقى تحذيراً إضافياً!' : ''}`;

    await sock.sendMessage(chatId, { 
        text: responseText,
        mentions: [userToCheck]
    }, { quoted: message });
}

module.exports = warningsCommand;