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
const { tmpdir } = require("os")
const Crypto = require("crypto")
const ff = require('fluent-ffmpeg')
const webp = require("node-webpmux")
const path = require("path")

// المجلد المؤقت
const TEMP_DIR = path.join(process.cwd(), 'temp')
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
}

/**
 * تحويل صورة إلى ملصق WebP
 * @param {Buffer} media - بيانات الصورة
 * @returns {Promise<Buffer>} - بيانات الملصق
 */
async function imageToWebp(media) {
    const tmpFileOut = path.join(TEMP_DIR, `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    const tmpFileIn = path.join(TEMP_DIR, `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.jpg`)

    fs.writeFileSync(tmpFileIn, media)

    await new Promise((resolve, reject) => {
        ff(tmpFileIn)
            .on("error", reject)
            .on("end", () => resolve(true))
            .addOutputOptions([
                "-vcodec",
                "libwebp",
                "-vf",
                "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse"
            ])
            .toFormat("webp")
            .save(tmpFileOut)
    })

    const buff = fs.readFileSync(tmpFileOut)
    fs.unlinkSync(tmpFileOut)
    fs.unlinkSync(tmpFileIn)
    return buff
}

/**
 * تحويل فيديو إلى ملصق متحرك WebP
 * @param {Buffer} media - بيانات الفيديو
 * @returns {Promise<Buffer>} - بيانات الملصق المتحرك
 */
async function videoToWebp(media) {
    const tmpFileOut = path.join(TEMP_DIR, `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    const tmpFileIn = path.join(TEMP_DIR, `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.mp4`)

    fs.writeFileSync(tmpFileIn, media)

    await new Promise((resolve, reject) => {
        ff(tmpFileIn)
            .on("error", reject)
            .on("end", () => resolve(true))
            .addOutputOptions([
                "-vcodec",
                "libwebp",
                "-vf",
                "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse",
                "-loop",
                "0",
                "-ss",
                "00:00:00",
                "-t",
                "00:00:05",
                "-preset",
                "default",
                "-an",
                "-vsync",
                "0"
            ])
            .toFormat("webp")
            .save(tmpFileOut)
    })

    const buff = fs.readFileSync(tmpFileOut)
    fs.unlinkSync(tmpFileOut)
    fs.unlinkSync(tmpFileIn)
    return buff
}

/**
 * إضافة بيانات تعريفية (EXIF) لملصق صورة
 * @param {Buffer} media - بيانات الصورة
 * @param {Object} metadata - بيانات التعريف { packname, author, categories }
 * @returns {Promise<string>} - مسار الملف الناتج
 */
async function writeExifImg(media, metadata) {
    let wMedia = await imageToWebp(media)
    const tmpFileIn = path.join(TEMP_DIR, `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    const tmpFileOut = path.join(TEMP_DIR, `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    fs.writeFileSync(tmpFileIn, wMedia)

    if (metadata.packname || metadata.author) {
        const img = new webp.Image()
        const json = { 
            "sticker-pack-id": `https://github.com/DarkXecutor/JAWAD.BOT`, 
            "sticker-pack-name": metadata.packname || "JAWAD.BOT", 
            "sticker-pack-publisher": metadata.author || "DarkXecutor", 
            "emojis": metadata.categories ? metadata.categories : ["🤖", "✨"]
        }
        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
        const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8")
        const exif = Buffer.concat([exifAttr, jsonBuff])
        exif.writeUIntLE(jsonBuff.length, 14, 4)
        await img.load(tmpFileIn)
        fs.unlinkSync(tmpFileIn)
        img.exif = exif
        await img.save(tmpFileOut)
        return tmpFileOut
    }
}

/**
 * إضافة بيانات تعريفية (EXIF) لملصق فيديو متحرك
 * @param {Buffer} media - بيانات الفيديو
 * @param {Object} metadata - بيانات التعريف { packname, author, categories }
 * @returns {Promise<string>} - مسار الملف الناتج
 */
async function writeExifVid(media, metadata) {
    let wMedia = await videoToWebp(media)
    const tmpFileIn = path.join(TEMP_DIR, `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    const tmpFileOut = path.join(TEMP_DIR, `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    fs.writeFileSync(tmpFileIn, wMedia)

    if (metadata.packname || metadata.author) {
        const img = new webp.Image()
        const json = { 
            "sticker-pack-id": `https://github.com/DarkXecutor/JAWAD.BOT`, 
            "sticker-pack-name": metadata.packname || "JAWAD.BOT", 
            "sticker-pack-publisher": metadata.author || "DarkXecutor", 
            "emojis": metadata.categories ? metadata.categories : ["🤖", "✨"]
        }
        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
        const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8")
        const exif = Buffer.concat([exifAttr, jsonBuff])
        exif.writeUIntLE(jsonBuff.length, 14, 4)
        await img.load(tmpFileIn)
        fs.unlinkSync(tmpFileIn)
        img.exif = exif
        await img.save(tmpFileOut)
        return tmpFileOut
    }
}

/**
 * إضافة بيانات تعريفية (EXIF) لملصق (يدعم الصور والفيديوهات والملصقات الموجودة)
 * @param {Object} media - بيانات الوسائط { data, mimetype }
 * @param {Object} metadata - بيانات التعريف { packname, author, categories }
 * @returns {Promise<string>} - مسار الملف الناتج
 */
async function writeExif(media, metadata) {
    let wMedia = /webp/.test(media.mimetype) ? media.data : 
                 /image/.test(media.mimetype) ? await imageToWebp(media.data) : 
                 /video/.test(media.mimetype) ? await videoToWebp(media.data) : ""
    
    const tmpFileIn = path.join(TEMP_DIR, `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    const tmpFileOut = path.join(TEMP_DIR, `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    fs.writeFileSync(tmpFileIn, wMedia)

    if (metadata.packname || metadata.author) {
        const img = new webp.Image()
        const json = { 
            "sticker-pack-id": `https://github.com/DarkXecutor/JAWAD.BOT`, 
            "sticker-pack-name": metadata.packname || "JAWAD.BOT", 
            "sticker-pack-publisher": metadata.author || "DarkXecutor", 
            "emojis": metadata.categories ? metadata.categories : ["🤖", "✨"]
        }
        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
        const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8")
        const exif = Buffer.concat([exifAttr, jsonBuff])
        exif.writeUIntLE(jsonBuff.length, 14, 4)
        await img.load(tmpFileIn)
        fs.unlinkSync(tmpFileIn)
        img.exif = exif
        await img.save(tmpFileOut)
        return tmpFileOut
    }
}

module.exports = { 
    imageToWebp, 
    videoToWebp, 
    writeExifImg, 
    writeExifVid, 
    writeExif 
}