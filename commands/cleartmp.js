const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

// دالة تنظيف مجلد واحد
function clearDirectory(dirPath) {
    try {
        if (!fs.existsSync(dirPath)) {
            return { success: false, message: `المجلد غير موجود: ${path.basename(dirPath)}` };
        }
        const files = fs.readdirSync(dirPath);
        let deletedCount = 0;
        for (const file of files) {
            try {
                const filePath = path.join(dirPath, file);
                const stat = fs.lstatSync(filePath);
                if (stat.isDirectory()) {
                    fs.rmSync(filePath, { recursive: true, force: true });
                } else {
                    fs.unlinkSync(filePath);
                }
                deletedCount++;
            } catch (err) {
                console.error(`خطأ في حذف الملف ${file}:`, err);
            }
        }
        return { success: true, message: `تم تنظيف ${deletedCount} ملف في ${path.basename(dirPath)}`, count: deletedCount };
    } catch (error) {
        console.error('خطأ في تنظيف المجلد:', error);
        return { success: false, message: `فشل تنظيف الملفات في ${path.basename(dirPath)}`, error: error.message };
    }
}

// دالة تنظيف مجلدات tmp و temp
async function clearTmpDirectory() {
    const tmpDir = path.join(process.cwd(), 'tmp');
    const tempDir = path.join(process.cwd(), 'temp');
    const results = [];
    results.push(clearDirectory(tmpDir));
    results.push(clearDirectory(tempDir));
    
    const success = results.every(r => r.success);
    const totalDeleted = results.reduce((sum, r) => sum + (r.count || 0), 0);
    const message = results.map(r => r.message).join(' | ');
    return { success, message, count: totalDeleted };
}

// دالة معالجة الأمر اليدوي
async function clearTmpCommand(sock, chatId, msg) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!msg.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { 
                text: '⛔ *غير مصرح!*\n👑 هذا الأمر متاح فقط لمطور البوت!' 
            }, { quoted: msg });
            return;
        }

        // إظهار تفاعل "جاري التنظيف"
        await sock.sendMessage(chatId, {
            react: { text: '🧹', key: msg.key }
        });

        const result = await clearTmpDirectory();
        
        let responseText;
        if (result.success) {
            if (result.count === 0) {
                responseText = `🧹 *لا توجد ملفات مؤقتة للتنظيف!*\n📁 جميع المجلدات نظيفة.`;
            } else {
                responseText = `╭━━━≪•🧹 *تـنـظـيـف الـمـلـفـات الـمـؤقـتـة* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃✅ ${result.message}
┃━━━━━━━━━━━━━━━━━━━━━
┃📊 *إجمالي الملفات المحذوفة:* ${result.count}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
            }
        } else {
            responseText = `❌ *فشل التنظيف!*\n⚠️ ${result.message}`;
        }
        
        await sock.sendMessage(chatId, { 
            text: responseText 
        }, { quoted: msg });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: msg.key }
        });

    } catch (error) {
        console.error('خطأ في أمر تنظيف الملفات المؤقتة:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ *حدث خطأ!*\n⚠️ تعذر تنظيف الملفات المؤقتة.' 
        }, { quoted: msg });
    }
}

// بدء التنظيف التلقائي كل 6 ساعات
function startAutoClear() {
    // التشغيل فور بدء البوت
    clearTmpDirectory().then(result => {
        if (!result.success) {
            console.error(`[تنظيف تلقائي] ${result.message}`);
        } else if (result.count > 0) {
            console.log(`🧹 [تنظيف تلقائي] تم تنظيف ${result.count} ملف(ات) مؤقتة عند بدء التشغيل`);
        }
    });

    // تعيين الفاصل الزمني كل 6 ساعات
    setInterval(async () => {
        const result = await clearTmpDirectory();
        if (!result.success) {
            console.error(`[تنظيف تلقائي] ${result.message}`);
        } else if (result.count > 0) {
            console.log(`🧹 [تنظيف تلقائي] تم تنظيف ${result.count} ملف(ات) مؤقتة`);
        }
    }, 6 * 60 * 60 * 1000); // 6 ساعات
}

// بدء التنظيف التلقائي
startAutoClear();

module.exports = clearTmpCommand;