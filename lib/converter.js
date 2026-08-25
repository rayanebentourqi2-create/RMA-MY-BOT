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
const { spawn } = require('child_process')

/**
 * تنفيذ أمر ffmpeg لتحويل الوسائط
 * @param {Buffer} buffer - البيانات الأصلية
 * @param {Array} args - معاملات ffmpeg
 * @param {String} ext - امتداد الملف الأصلي
 * @param {String} ext2 - امتداد الملف الناتج
 * @returns {Promise<Buffer>} - البيانات المحولة
 */
function ffmpeg(buffer, args = [], ext = '', ext2 = '') {
  return new Promise(async (resolve, reject) => {
    try {
      // إنشاء المجلد المؤقت إذا لم يكن موجوداً
      const tempDir = path.join(__dirname, '../temp')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }
      
      const inputFile = path.join(tempDir, Date.now() + '.' + ext)
      const outputFile = inputFile + '.' + ext2
      
      // كتابة البيانات إلى ملف مؤقت
      await fs.promises.writeFile(inputFile, buffer)
      
      // تشغيل ffmpeg
      spawn('ffmpeg', [
        '-y',           // استبدال الملفات بدون تأكيد
        '-i', inputFile, // ملف الإدخال
        ...args,        // معاملات ffmpeg
        outputFile      // ملف الإخراج
      ])
        .on('error', reject)
        .on('close', async (code) => {
          try {
            // حذف ملف الإدخال المؤقت
            await fs.promises.unlink(inputFile)
            
            if (code !== 0) {
              return reject(new Error(`ffmpeg exited with code ${code}`))
            }
            
            // قراءة ملف الإخراج
            const result = await fs.promises.readFile(outputFile)
            
            // حذف ملف الإخراج المؤقت
            await fs.promises.unlink(outputFile)
            
            resolve(result)
          } catch (e) {
            reject(e)
          }
        })
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * تحويل الصوت إلى تنسيق MP3 مناسب للواتساب
 * @param {Buffer} buffer - البيانات الصوتية الأصلية
 * @param {String} ext - امتداد الملف الأصلي
 * @returns {Promise<Buffer>} - البيانات الصوتية المحولة
 */
function toAudio(buffer, ext) {
  return ffmpeg(buffer, [
    '-vn',           // إزالة الفيديو (إن وجد)
    '-ac', '2',      // عدد القنوات الصوتية
    '-b:a', '128k',  // معدل البت الصوتي
    '-ar', '44100',  // معدل العينة
    '-f', 'mp3'      // تنسيق الإخراج
  ], ext, 'mp3')
}

/**
 * تحويل الصوت إلى تنسيق PTT (رسالة صوتية) للواتساب
 * @param {Buffer} buffer - البيانات الصوتية الأصلية
 * @param {String} ext - امتداد الملف الأصلي
 * @returns {Promise<Buffer>} - البيانات الصوتية المحولة
 */
function toPTT(buffer, ext) {
  return ffmpeg(buffer, [
    '-vn',                     // إزالة الفيديو
    '-c:a', 'libopus',         // ترميز Opus
    '-b:a', '128k',            // معدل البت
    '-vbr', 'on',              // معدل بت متغير
    '-compression_level', '10' // مستوى الضغط
  ], ext, 'opus')
}

/**
 * تحويل الفيديو إلى تنسيق MP4 مناسب للواتساب
 * @param {Buffer} buffer - بيانات الفيديو الأصلية
 * @param {String} ext - امتداد الملف الأصلي
 * @returns {Promise<Buffer>} - بيانات الفيديو المحولة
 */
function toVideo(buffer, ext) {
  return ffmpeg(buffer, [
    '-c:v', 'libx264',   // ترميز الفيديو H.264
    '-c:a', 'aac',       // ترميز الصوت AAC
    '-ab', '128k',       // معدل البت الصوتي
    '-ar', '44100',      // معدل العينة الصوتي
    '-crf', '32',        // جودة الفيديو (0-51، 32 متوسط)
    '-preset', 'slow'    // سرعة الترميز (slow = جودة أفضل)
  ], ext, 'mp4')
}

module.exports = {
  toAudio,
  toPTT,
  toVideo,
  ffmpeg,
}