const fetch = require('node-fetch');
const FormData = require('form-data');
const FileType = require('file-type');
const fs = require('fs');
const path = require('path');

// المجلد المؤقت
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * رفع صورة إلى qu.ax
 * الصيغ المدعومة:
 * - `image/jpeg`
 * - `image/jpg`
 * - `image/png`
 * @param {Buffer} buffer - بيانات الصورة
 * @return {Promise<string>} - رابط الصورة المرفوعة
 */
async function uploadImage(buffer) {
    try {
        // تحديد نوع الملف
        const fileType = await FileType.fromBuffer(buffer);
        const { ext, mime } = fileType || { ext: 'png', mime: 'image/png' };
        
        // التحقق من صحة نوع الملف
        const supportedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!supportedMimes.includes(mime)) {
            throw new Error(`نوع الملف غير مدعوم: ${mime}. الصيغ المدعومة: JPEG, PNG, WebP`);
        }
        
        const tempFile = path.join(TEMP_DIR, `temp_${Date.now()}.${ext}`);

        // حفظ البيانات في ملف مؤقت
        fs.writeFileSync(tempFile, buffer);

        // إنشاء بيانات النموذج
        const form = new FormData();
        form.append('files[]', fs.createReadStream(tempFile));

        // رفع إلى qu.ax
        const response = await fetch('https://qu.ax/upload.php', {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });

        // حذف الملف المؤقت
        try { fs.unlinkSync(tempFile); } catch(e) {}

        const result = await response.json();
        
        if (result && result.success && result.files && result.files[0]) {
            return result.files[0].url;
        } else {
            console.log('qu.ax فشل، جاري تجربة Telegra.ph...');
            
            // الاحتياط: الرفع إلى Telegra.ph
            const telegraphForm = new FormData();
            telegraphForm.append('file', buffer, {
                filename: `upload.${ext}`,
                contentType: mime
            });

            const telegraphResponse = await fetch('https://telegra.ph/upload', {
                method: 'POST',
                body: telegraphForm,
                headers: telegraphForm.getHeaders()
            });

            const img = await telegraphResponse.json();
            
            if (img && img[0] && img[0].src) {
                return 'https://telegra.ph' + img[0].src;
            }
            
            throw new Error('فشل رفع الصورة إلى جميع الخدمات');
        }
    } catch (error) {
        console.error('خطأ في رفع الصورة:', error);
        throw error;
    }
}

/**
 * رفع صورة مباشرة إلى Telegra.ph
 * @param {Buffer} buffer - بيانات الصورة
 * @return {Promise<string>} - رابط الصورة المرفوعة
 */
async function uploadToTelegraph(buffer) {
    try {
        const fileType = await FileType.fromBuffer(buffer);
        const { ext, mime } = fileType || { ext: 'png', mime: 'image/png' };
        
        const form = new FormData();
        form.append('file', buffer, {
            filename: `upload.${ext}`,
            contentType: mime
        });

        const response = await fetch('https://telegra.ph/upload', {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });

        const img = await response.json();
        
        if (img && img[0] && img[0].src) {
            return 'https://telegra.ph' + img[0].src;
        }
        
        throw new Error(img.error || 'فشل رفع الصورة إلى Telegra.ph');
    } catch (error) {
        console.error('خطأ في رفع الصورة إلى Telegra.ph:', error);
        throw error;
    }
}

/**
 * رفع صورة من مسار ملف
 * @param {string} filePath - مسار الصورة
 * @return {Promise<string>} - رابط الصورة المرفوعة
 */
async function uploadImageFromPath(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`الملف غير موجود: ${filePath}`);
        }
        
        const buffer = fs.readFileSync(filePath);
        return await uploadImage(buffer);
    } catch (error) {
        console.error('خطأ في رفع الصورة من المسار:', error);
        throw error;
    }
}

/**
 * رفع صور متعددة
 * @param {Array<Buffer>} buffers - مصفوفة من بيانات الصور
 * @return {Promise<Array<string>>} - مصفوفة من الروابط
 */
async function uploadMultipleImages(buffers) {
    const results = [];
    for (const buffer of buffers) {
        try {
            const url = await uploadImage(buffer);
            results.push(url);
        } catch (error) {
            console.error('خطأ في رفع صورة:', error);
            results.push(null);
        }
    }
    return results;
}

module.exports = { 
    uploadImage,
    uploadToTelegraph,
    uploadImageFromPath,
    uploadMultipleImages
};