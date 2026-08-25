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
const axios = require("axios")
const cheerio = require("cheerio")
const { resolve } = require("path")
const util = require("util")
let BodyForm = require('form-data')
let { fromBuffer } = require('file-type')
let fs = require('fs')
const child_process = require('child_process')
const ffmpeg = require('fluent-ffmpeg')
const { unlink } = require('fs').promises
const path = require('path')

// إنشاء المجلدات المؤقتة إذا لم تكن موجودة
const TEMP_DIR = path.join(process.cwd(), 'temp')
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
}

exports.sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

exports.fetchJson = async (url, options) => {
    try {
        options ? options : {}
        const res = await axios({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
            },
            ...options
        })
        return res.data
    } catch (err) {
        return err
    }
}

exports.fetchBuffer = async (url, options) => {
    try {
        options ? options : {}
        const res = await axios({
            method: "GET",
            url,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.70 Safari/537.36",
                'DNT': 1,
                'Upgrade-Insecure-Request': 1
            },
            ...options,
            responseType: 'arraybuffer'
        })
        return res.data
    } catch (err) {
        return err
    }
}

/**
 * تحويل ملف WebP إلى MP4
 * @param {string} path - مسار ملف WebP
 * @returns {Promise<Object>} - رابط الفيديو الناتج
 */
exports.webp2mp4File = async (path) => {
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

exports.fetchUrl = async (url, options) => {
    try {
        options ? options : {}
        const res = await axios({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
            },
            ...options
        })
        return res.data
    } catch (err) {
        return err
    }
}

exports.WAVersion = async () => {
    let get = await exports.fetchUrl("https://web.whatsapp.com/check-update?version=1&platform=web")
    let version = [get.currentVersion.replace(/[.]/g, ", ")]
    return version
}

exports.getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`
}

exports.isUrl = (url) => {
    return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/, 'gi'))
}

exports.isNumber = (number) => {
    const int = parseInt(number)
    return typeof int === 'number' && !isNaN(int)
}

/**
 * رفع ملف إلى Telegra.ph
 * @param {string} Path - مسار الملف
 * @returns {Promise<string>} - رابط الملف المرفوع
 */
exports.TelegraPh = (Path) => {
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
 * @param {string} filePath - مسار الملف
 * @returns {Promise<string>} - رابط الملف المرفوع
 */
exports.UguuUpload = async (filePath) => {
    try {
        const form = new BodyForm();
        form.append("files[]", fs.createReadStream(filePath));
        
        const response = await axios.post("https://uguu.se/upload.php", form, {
            headers: {
                ...form.getHeaders(),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (response.data && response.data.files && response.data.files[0]) {
            return response.data.files[0].url;
        }
        throw new Error("فشل الرفع إلى Uguu");
    } catch (error) {
        console.error("خطأ في رفع Uguu:", error);
        return null;
    }
}

/**
 * رفع ملف إلى Catbox.moe
 * @param {string} filePath - مسار الملف
 * @returns {Promise<string>} - رابط الملف المرفوع
 */
exports.CatboxUpload = async (filePath) => {
    try {
        const form = new BodyForm();
        form.append("reqtype", "fileupload");
        form.append("fileToUpload", fs.createReadStream(filePath));
        
        const response = await axios.post("https://catbox.moe/user/api.php", form, {
            headers: {
                ...form.getHeaders()
            }
        });
        
        return response.data;
    } catch (error) {
        console.error("خطأ في رفع Catbox:", error);
        return null;
    }
}

/**
 * رفع ملف (اختيار الخدمة تلقائياً)
 * @param {string} filePath - مسار الملف
 * @returns {Promise<string>} - رابط الملف المرفوع
 */
exports.UploadFileUgu = async (filePath) => {
    return await exports.UguuUpload(filePath);
}

const sleepy = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * تحويل GIF إلى MP4
 * @param {Buffer} image - بيانات صورة GIF
 * @returns {Promise<Buffer>} - بيانات الفيديو MP4
 */
exports.buffergif = async (image) => {
    const filename = `${Math.random().toString(36)}`
    const gifPath = path.join(TEMP_DIR, `${filename}.gif`)
    const mp4Path = path.join(TEMP_DIR, `${filename}.mp4`)
    
    await fs.writeFileSync(gifPath, image)
    child_process.exec(
        `ffmpeg -i ${gifPath} -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" ${mp4Path}`
    )
    await sleepy(4000)
    
    var buffer5 = await fs.readFileSync(mp4Path)
    Promise.all([unlink(mp4Path), unlink(gifPath)])
    return buffer5
}