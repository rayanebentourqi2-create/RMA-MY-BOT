const fs = require('fs');
const path = require('path');

const dataFilePath = path.join(__dirname, '..', 'data', 'messageCount.json');

// تحميل إحصائيات الرسائل
function loadMessageCounts() {
    try {
        if (!fs.existsSync(dataFilePath)) {
            // إنشاء المجلد إذا لم يكن موجوداً
            const dataDir = path.join(__dirname, '..', 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            // إنشاء ملف فارغ
            saveMessageCounts({});
            return {};
        }
        const data = fs.readFileSync(dataFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('خطأ في تحميل الإحصائيات:', error);
        return {};
    }
}

// حفظ إحصائيات الرسائل
function saveMessageCounts(messageCounts) {
    try {
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(dataFilePath, JSON.stringify(messageCounts, null, 2));
    } catch (error) {
        console.error('خطأ في حفظ الإحصائيات:', error);
    }
}

// زيادة عداد الرسائل للمستخدم
function incrementMessageCount(groupId, userId) {
    try {
        const messageCounts = loadMessageCounts();

        if (!messageCounts[groupId]) {
            messageCounts[groupId] = {};
        }

        if (!messageCounts[groupId][userId]) {
            messageCounts[groupId][userId] = 0;
        }

        messageCounts[groupId][userId] += 1;

        saveMessageCounts(messageCounts);
    } catch (error) {
        console.error('خطأ في زيادة عداد الرسائل:', error);
    }
}

// عرض الأعضاء النشطين
async function topMembers(sock, chatId, isGroup, message) {
    if (!isGroup) {
        await sock.sendMessage(chatId, { 
            text: '⚠️ *هذا الأمر متاح فقط في المجموعات!*\n📌 يمكنك استخدامه في المجموعات فقط.'
        }, { quoted: message });
        return;
    }

    try {
        // إظهار تفاعل "جاري التحميل"
        await sock.sendMessage(chatId, {
            react: { text: '📊', key: message?.key || {} }
        });

        const messageCounts = loadMessageCounts();
        const groupCounts = messageCounts[chatId] || {};

        // ترتيب الأعضاء حسب عدد الرسائل (تنازلي)
        const sortedMembers = Object.entries(groupCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10); // عرض أفضل 10 أعضاء

        if (sortedMembers.length === 0) {
            await sock.sendMessage(chatId, { 
                text: '📊 *لا توجد إحصائيات بعد!*\n✨ قم بإرسال بعض الرسائل لتظهر في القائمة.'
            }, { quoted: message });
            return;
        }

        // حساب إجمالي عدد الرسائل
        const totalMessages = Object.values(groupCounts).reduce((sum, count) => sum + count, 0);

        // إنشاء رسالة النتيجة
        let resultMessage = `╭━━━≪•📊 *الأعـضـاء الأكـثـر نـشـاطـاً* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃👥 *المجموعة:* ${chatId.split('@')[0]}
┃📨 *إجمالي الرسائل:* ${totalMessages}
┃━═━═━━═━═━━═━═━
┃🏆 *الترتيب حسب عدد الرسائل:*
┃━━━━━━━━━━━━━━━━━━━━━\n`;

        // إضافة كل عضو مع ميدالية حسب المركز
        sortedMembers.forEach(([userId, count], index) => {
            let medal = '';
            if (index === 0) medal = '🥇';
            else if (index === 1) medal = '🥈';
            else if (index === 2) medal = '🥉';
            else medal = `${index + 1}️⃣`;
            
            const userName = userId.split('@')[0];
            resultMessage += `┃ ${medal} @${userName} • ${count} رسالة\n`;
        });

        resultMessage += `┃━━━━━━━━━━━━━━━━━━━━━
┃💡 *استمر في النشاط لتصعد الترتيب!*
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        await sock.sendMessage(chatId, { 
            text: resultMessage,
            mentions: sortedMembers.map(([userId]) => userId)
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message?.key || {} }
        });

    } catch (error) {
        console.error('خطأ في عرض الأعضاء النشطين:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ *حدث خطأ!*\n⚠️ تعذر عرض إحصائيات الأعضاء. يرجى المحاولة لاحقاً.'
        }, { quoted: message });
    }
}

module.exports = { incrementMessageCount, topMembers };