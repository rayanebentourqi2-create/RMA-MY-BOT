/**
 * JAWAD.BOT - بوت واتساب
 * حقوق النشر © 2025 DarkXecutor
 * 
 * هذا البرنامج مجاني: يمكنك إعادة توزيعه وتعديله
 * وفقاً لرخصة MIT.
 * 
 * الاعتمادات:
 * - مكتبة Baileys بواسطة @adiwajshing
 * - كود الاقتران مستوحى من TechGod143 & DGXEON
 */
let axios = require('axios')
let BodyForm = require('form-data')
let { fromBuffer } = require('file-type')
let fetch = require('node-fetch')
let fs = require('fs')
let cheerio = require('cheerio')
let path = require('path')

// المجلد المؤقت
const TEMP_DIR = path.join(process.cwd(), 'temp')
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
}

/**
 * رفع ملف إلى Telegra.ph
 * @param {string} Path - مسار الملف المراد رفعه
 * @returns {Promise<string>} - رابط الملف المرفوع
 */
function TelegraPh(Path) {
    return new Promise(async (resolve, reject) => {
        if (!fs.existsSync(Path)) return reject(new Error("الملف غير موجود"))
        try {
            const form = new BodyForm();
            form.append("file", fs.createReadStream(Path))
            const data = await axios({
                url: "https://telegra.ph/upload",
                method: "POST",
                headers: {
                    ...form.getHeaders()
                },
                data: form
            })
            return resolve("https://telegra.ph" + data.data[0].src)
        } catch (err) {
            return reject(new Error(String(err)))
        }
    })
}

/**
 * رفع ملف إلى Uguu.se
 * @param {string} input - مسار الملف المراد رفعه
 * @returns {Promise<Object>} - معلومات الملف المرفوع
 */
async function UploadFileUgu(input) {
    return new Promise(async (resolve, reject) => {
        const form = new BodyForm();
        form.append("files[]", fs.createReadStream(input))
        await axios({
            url: "https://uguu.se/upload.php",
            method: "POST",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
                ...form.getHeaders()
            },
            data: form
        }).then((data) => {
            resolve(data.data.files[0])
        }).catch((err) => reject(err))
    })
}

/**
 * تحويل ملف WebP إلى MP4
 * @param {string} path - مسار ملف WebP
 * @returns {Promise<Object>} - رابط الفيديو الناتج
 */
function webp2mp4File(path) {
    return new Promise((resolve, reject) => {
        const form = new BodyForm()
        form.append('new-image-url', '')
        form.append('new-image', fs.createReadStream(path))
        axios({
            method: 'post',
            url: 'https://s6.ezgif.com/webp-to-mp4',
            data: form,
            headers: {
                'Content-Type': `multipart/form-data; boundary=${form._boundary}`
            }
        }).then(({ data }) => {
            const bodyFormThen = new BodyForm()
            const $ = cheerio.load(data)
            const file = $('input[name="file"]').attr('value')
            bodyFormThen.append('file', file)
            bodyFormThen.append('convert', "Convert WebP to MP4!")
            axios({
                method: 'post',
                url: 'https://ezgif.com/webp-to-mp4/' + file,
                data: bodyFormThen,
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${bodyFormThen._boundary}`
                }
            }).then(({ data }) => {
                const $ = cheerio.load(data)
                const result = 'https:' + $('div#output > p.outfile > video > source').attr('src')
                resolve({
                    status: true,
                    message: "تم التحويل بواسطة JAWAD.BOT",
                    result: result
                })
            }).catch(reject)
        }).catch(reject)
    })
}

/**
 * رفع ملف إلى FloNime
 * @param {Buffer} medianya - بيانات الملف
 * @param {Object} options - خيارات إضافية
 * @returns {Promise<Object>} - معلومات الملف المرفوع
 */
async function floNime(medianya, options = {}) {
    const { ext } = await fromBuffer(medianya) || options.ext
    var form = new BodyForm()
    form.append('file', medianya, 'tmp.' + ext)
    let jsonnya = await fetch('https://flonime.my.id/upload', {
        method: 'POST',
        body: form
    })
        .then((response) => response.json())
    return jsonnya
}

/**
 * رفع ملف (وظيفة شاملة تحاول عدة خدمات)
 * @param {string} filePath - مسار الملف
 * @returns {Promise<string>} - رابط الملف المرفوع
 */
async function uploadFile(filePath) {
    try {
        // محاولة الرفع إلى Telegra.ph أولاً
        const telegraUrl = await TelegraPh(filePath);
        if (telegraUrl) return telegraUrl;
    } catch (e) {
        console.log('Telegra.ph فشل، جاري تجربة Uguu.se...');
    }
    
    try {
        // محاولة الرفع إلى Uguu.se
        const uguuResult = await UploadFileUgu(filePath);
        if (uguuResult && uguuResult.url) return uguuResult.url;
    } catch (e) {
        console.log('Uguu.se فشل');
    }
    
    throw new Error('فشل رفع الملف إلى جميع الخدمات');
}

/**
 * رفع ملف من Buffer
 * @param {Buffer} buffer - بيانات الملف
 * @param {string} filename - اسم الملف
 * @returns {Promise<string>} - رابط الملف المرفوع
 */
async function uploadBuffer(buffer, filename = 'file') {
    const tempPath = path.join(TEMP_DIR, `${Date.now()}_${filename}`);
    fs.writeFileSync(tempPath, buffer);
    try {
        const url = await uploadFile(tempPath);
        return url;
    } finally {
        // حذف الملف المؤقت
        try { fs.unlinkSync(tempPath); } catch(e) {}
    }
}

module.exports = { 
    TelegraPh, 
    UploadFileUgu, 
    webp2mp4File, 
    floNime,
    uploadFile,
    uploadBuffer
}