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
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { spawn } = require('child_process')
const { fileTypeFromBuffer } = require('file-type')
const webp = require('node-webpmux')
const fetch = require('node-fetch')
const ffmpeg = require('fluent-ffmpeg')
const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)
const { writeExifImg, writeExifVid, writeExif } = require('./exif')

// المجلد المؤقت
const TEMP_DIR = path.join(__dirname, '../temp')
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
}

/**
 * تحويل صورة إلى ملصق (الطريقة 1)
 * @param {Buffer} img - بيانات الصورة
 * @param {String} url - رابط الصورة (اختياري)
 */
function sticker2(img, url) {
    return new Promise(async (resolve, reject) => {
        try {
            if (url) {
                let res = await fetch(url)
                if (res.status !== 200) throw await res.text()
                img = await res.buffer()
            }
            let inp = path.join(TEMP_DIR, +new Date() + '.jpeg')
            await fs.promises.writeFile(inp, img)
            let ff = spawn('ffmpeg', [
                '-y',
                '-i', inp,
                '-vf', 'scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1',
                '-f', 'png',
                '-'
            ])
            ff.on('error', reject)
            ff.on('close', async () => {
                await fs.promises.unlink(inp)
            })
            let bufs = []
            const [_spawnprocess, ..._spawnargs] = [...(module.exports.support.gm ? ['gm'] : module.exports.magick ? ['magick'] : []), 'convert', 'png:-', 'webp:-']
            let im = spawn(_spawnprocess, _spawnargs)
            im.on('error', e => console.error(e))
            im.stdout.on('data', chunk => bufs.push(chunk))
            ff.stdout.pipe(im.stdin)
            im.on('exit', () => {
                resolve(Buffer.concat(bufs))
            })
        } catch (e) {
            reject(e)
        }
    })
}

/**
 * تحويل صورة/فيديو إلى ملصق (الطريقة 2 - عبر API)
 * @param {Buffer} img - بيانات الوسائط
 * @param {String} url - رابط الوسائط
 * @param {String} packname - اسم الحزمة
 * @param {String} author - اسم المؤلف
 */
async function sticker3(img, url, packname, author) {
    url = url ? url : await uploadFile(img)
    let res = await fetch('https://api.xteam.xyz/sticker/wm?' + new URLSearchParams(Object.entries({
        url,
        packname: packname || 'JAWAD.BOT',
        author: author || 'DarkXecutor'
    })))
    return await res.buffer()
}

/**
 * تحويل صورة إلى ملصق (الطريقة 3 - عبر ffmpeg)
 * @param {Buffer} img - بيانات الصورة
 * @param {String} url - رابط الصورة
 */
async function sticker4(img, url) {
    if (url) {
        let res = await fetch(url)
        if (res.status !== 200) throw await res.text()
        img = await res.buffer()
    }
    return await ffmpeg(img, [
        '-vf', 'scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1'
    ], 'jpeg', 'webp')
}

/**
 * تحويل إلى ملصق باستخدام wa-sticker-formatter
 * @param {Buffer} img - بيانات الوسائط
 * @param {String} url - رابط الوسائط
 * @param {String} packname - اسم الحزمة
 * @param {String} author - اسم المؤلف
 * @param {Array} categories - الإيموجيات
 * @param {Object} extra - إعدادات إضافية
 */
async function sticker5(img, url, packname, author, categories = ['🤖'], extra = {}) {
    const { Sticker } = await import('wa-sticker-formatter')
    const stickerMetadata = {
        type: 'default',
        pack: packname || 'JAWAD.BOT',
        author: author || 'DarkXecutor',
        categories: categories,
        ...extra
    }
    return (new Sticker(img ? img : url, stickerMetadata)).toBuffer()
}

/**
 * تحويل باستخدام fluent-ffmpeg
 * @param {string} img 
 * @param {string} url 
 */
function sticker6(img, url) {
    return new Promise(async (resolve, reject) => {
        if (url) {
            let res = await fetch(url)
            if (res.status !== 200) throw await res.text()
            img = await res.buffer()
        }
        const type = await fileTypeFromBuffer(img) || {
            mime: 'application/octet-stream',
            ext: 'bin'
        }
        if (type.ext == 'bin') reject(img)
        const tmp = path.join(TEMP_DIR, `${+new Date()}.${type.ext}`)
        const out = path.join(tmp + '.webp')
        await fs.promises.writeFile(tmp, img)
        
        let Fffmpeg = /video/i.test(type.mime) ? ffmpeg(tmp).inputFormat(type.ext) : ffmpeg(tmp).input(tmp)
        Fffmpeg
            .on('error', function (err) {
                console.error(err)
                fs.promises.unlink(tmp)
                reject(img)
            })
            .on('end', async function () {
                fs.promises.unlink(tmp)
                resolve(await fs.promises.readFile(out))
            })
            .addOutputOptions([
                `-vcodec`, `libwebp`, `-vf`,
                `scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse`
            ])
            .toFormat('webp')
            .save(out)
    })
}

/**
 * إضافة بيانات EXIF لملصق WebP
 * @param {Buffer} webpSticker - بيانات الملصق
 * @param {String} packname - اسم الحزمة
 * @param {String} author - اسم المؤلف
 * @param {Array} categories - الإيموجيات
 * @param {Object} extra - إعدادات إضافية
 * @returns {Promise<Buffer>} - بيانات الملصق مع EXIF
 */
async function addExif(webpSticker, packname, author, categories = ['🤖'], extra = {}) {
    const img = new webp.Image();
    const stickerPackId = crypto.randomBytes(32).toString('hex');
    const json = {
        'sticker-pack-id': stickerPackId,
        'sticker-pack-name': packname || 'JAWAD.BOT',
        'sticker-pack-publisher': author || 'DarkXecutor',
        'emojis': categories,
        ...extra
    };
    let exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    let jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
    let exif = Buffer.concat([exifAttr, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);
    await img.load(webpSticker)
    img.exif = exif
    return await img.save(null)
}

/**
 * تحويل الوسائط إلى ملصق مع إضافة بيانات تعريفية
 * @param {boolean} isImage - هل هي صورة
 * @param {String} url - رابط الوسائط
 * @param {String} packname - اسم الحزمة
 * @param {String} author - اسم المؤلف
 * @returns {Promise<Buffer>} - بيانات الملصق
 */
async function sticker(isImage, url, packname, author) {
    try {
        const response = await fetch(url);
        const buffer = await response.buffer();
        
        const stickerBuffer = await writeExifImg(buffer, {
            packname: packname || 'JAWAD.BOT',
            author: author || 'DarkXecutor',
            categories: ['🤖', '✨']
        });
        
        return stickerBuffer;
    } catch (error) {
        console.error('خطأ في إنشاء الملصق:', error);
        return null;
    }
}

const support = {
    ffmpeg: true,
    ffprobe: true,
    ffmpegWebp: true,
    convert: true,
    magick: false,
    gm: false,
    find: false
}

module.exports = {
    sticker,
    sticker2,
    sticker3,
    sticker4,
    sticker5,
    sticker6,
    addExif,
    support
}