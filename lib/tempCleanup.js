const fs = require('fs');
const path = require('path');

/**
 * تنظيف الملفات المؤقتة القديمة
 * يتم حذف الملفات التي مضى عليها أكثر من 3 ساعات
 */
function cleanupTempFiles() {
    const tempDir = path.join(process.cwd(), 'temp');
    
    if (!fs.existsSync(tempDir)) {
        console.log('📁 مجلد temp غير موجود، سيتم إنشاؤه عند الحاجة');
        return;
    }
    
    fs.readdir(tempDir, (err, files) => {
        if (err) {
            console.error('❌ خطأ في قراءة المجلد المؤقت:', err);
            return;
        }
        
        if (files.length === 0) {
            console.log('🧹 لا توجد ملفات مؤقتة للتنظيف');
            return;
        }
        
        let cleanedCount = 0;
        const now = Date.now();
        const maxAge = 3 * 60 * 60 * 1000; // 3 ساعات
        
        files.forEach(file => {
            const filePath = path.join(tempDir, file);
            
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    console.error(`❌ خطأ في قراءة معلومات الملف ${file}:`, err);
                    return;
                }
                
                // حذف الملفات الأقدم من 3 ساعات
                if (now - stats.mtimeMs > maxAge) {
                    fs.unlink(filePath, (err) => {
                        if (!err) {
                            cleanedCount++;
                            console.log(`🧹 تم حذف الملف المؤقت: ${file}`);
                        } else {
                            console.error(`❌ خطأ في حذف الملف ${file}:`, err);
                        }
                    });
                }
            });
        });
        
        // عرض ملخص بعد ثانية واحدة (لانتظار اكتمال الحذف)
        setTimeout(() => {
            if (cleanedCount > 0) {
                console.log(`🧹 تم تنظيف ${cleanedCount} ملف(ات) مؤقتة`);
            }
        }, 1000);
    });
}

/**
 * تنظيف جميع الملفات المؤقتة (حذف قسري)
 */
function cleanupAllTempFiles() {
    const tempDir = path.join(process.cwd(), 'temp');
    
    if (!fs.existsSync(tempDir)) {
        console.log('📁 مجلد temp غير موجود');
        return;
    }
    
    const files = fs.readdirSync(tempDir);
    let cleanedCount = 0;
    
    files.forEach(file => {
        const filePath = path.join(tempDir, file);
        try {
            fs.unlinkSync(filePath);
            cleanedCount++;
            console.log(`🧹 تم حذف الملف المؤقت: ${file}`);
        } catch (err) {
            console.error(`❌ خطأ في حذف الملف ${file}:`, err);
        }
    });
    
    if (cleanedCount > 0) {
        console.log(`🧹 تم تنظيف ${cleanedCount} ملف(ات) مؤقتة (حذف كامل)`);
    } else {
        console.log('🧹 لا توجد ملفات مؤقتة للتنظيف');
    }
}

/**
 * الحصول على حجم المجلد المؤقت
 * @returns {Promise<string>} - حجم المجلد المؤقت
 */
async function getTempFolderSize() {
    const tempDir = path.join(process.cwd(), 'temp');
    
    if (!fs.existsSync(tempDir)) {
        return '0 بايت';
    }
    
    const files = fs.readdirSync(tempDir);
    let totalSize = 0;
    
    files.forEach(file => {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
    });
    
    // تحويل الحجم إلى وحدة مناسبة
    if (totalSize < 1024) return `${totalSize} بايت`;
    if (totalSize < 1024 * 1024) return `${(totalSize / 1024).toFixed(2)} كيلوبايت`;
    return `${(totalSize / (1024 * 1024)).toFixed(2)} ميغابايت`;
}

// التنظيف عند بدء التشغيل
cleanupTempFiles();

// التنظيف كل ساعة
setInterval(cleanupTempFiles, 60 * 60 * 1000);

module.exports = { 
    cleanupTempFiles,
    cleanupAllTempFiles,
    getTempFolderSize
};