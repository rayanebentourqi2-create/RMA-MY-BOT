const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { writeExifImg, writeExifVid } = require('../lib/exif');

// المجلد المؤقت
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function attpCommand(sock, chatId, message) {
    const userMessage = message.message.conversation || message.message.extendedTextMessage?.text || '';
    const text = userMessage.split(' ').slice(1).join(' ');

    if (!text) {
        await sock.sendMessage(chatId, { 
            text: '🎨 *أمر تحويل النص إلى ملصق متحرك - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.متحرك <النص>`\n\n📝 *مثال:*\n`.متحرك مرحباً`\n`.متحرك JAWAD`\n\n✨ *سيتم تحويل النص إلى ملصق متحرك بألوان متغيرة*'
        }, { quoted: message });
        return;
    }

    // إظهار تفاعل "جاري المعالجة"
    await sock.sendMessage(chatId, {
        react: { text: '🎨', key: message.key }
    });

    // إرسال رسالة "جاري التجهيز"
    const processingMsg = await sock.sendMessage(chatId, { 
        text: '🎨 *جاري تحويل النص إلى ملصق متحرك...*\n📝 النص: ' + text + '\n⏳ يرجى الانتظار'
    }, { quoted: message });

    try {
        const mp4Buffer = await renderBlinkingVideoWithFfmpeg(text);
        const webpPath = await writeExifVid(mp4Buffer, { 
            packname: 'JAWAD.BOT',
            author: 'DarkXecutor',
            categories: ['🎨', '✨', '🤖']
        });
        const webpBuffer = fs.readFileSync(webpPath);
        try { fs.unlinkSync(webpPath) } catch(e) {}
        
        // حذف رسالة "جاري التجهيز"
        await sock.sendMessage(chatId, { delete: processingMsg.key });
        
        await sock.sendMessage(chatId, { sticker: webpBuffer }, { quoted: message });
        
        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });
    } catch (error) {
        console.error('خطأ في إنشاء الملصق المتحرك:', error);
        await sock.sendMessage(chatId, { delete: processingMsg.key });
        await sock.sendMessage(chatId, { 
            text: '❌ *حدث خطأ!*\n⚠️ تعذر إنشاء الملصق المتحرك. يرجى التأكد من تثبيت ffmpeg بشكل صحيح.'
        }, { quoted: message });
    }
}

module.exports = attpCommand;

/**
 * تحويل النص إلى صورة PNG باستخدام ffmpeg
 * @param {string} text - النص المراد تحويله
 * @returns {Promise<Buffer>} - بيانات الصورة
 */
function renderTextToPngWithFfmpeg(text) {
    return new Promise((resolve, reject) => {
        // مسار الخط حسب نظام التشغيل
        const fontPath = process.platform === 'win32'
            ? 'C:/Windows/Fonts/arialbd.ttf'
            : '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

        // ترميز النص لـ ffmpeg
        const escapeDrawtextText = (s) => s
            .replace(/\\/g, '\\\\')
            .replace(/:/g, '\\:')
            .replace(/'/g, "\\'")
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]')
            .replace(/%/g, '\\%');

        const safeText = escapeDrawtextText(text);
        const safeFontPath = process.platform === 'win32'
            ? fontPath.replace(/\\/g, '/').replace(':', '\\:')
            : fontPath;

        const args = [
            '-y',
            '-f', 'lavfi',
            '-i', 'color=c=#00000000:s=512x512',
            '-vf', `drawtext=fontfile='${safeFontPath}':text='${safeText}':fontcolor=white:fontsize=56:borderw=2:bordercolor=black@0.6:x=(w-text_w)/2:y=(h-text_h)/2`,
            '-frames:v', '1',
            '-f', 'image2',
            'pipe:1'
        ];

        const ff = spawn('ffmpeg', args);
        const chunks = [];
        const errors = [];
        ff.stdout.on('data', d => chunks.push(d));
        ff.stderr.on('data', e => errors.push(e));
        ff.on('error', reject);
        ff.on('close', code => {
            if (code === 0) return resolve(Buffer.concat(chunks));
            reject(new Error(Buffer.concat(errors).toString() || `ffmpeg exited with code ${code}`));
        });
    });
}

/**
 * تحويل النص إلى فيديو متحرك (ألوان متغيرة وامضة) باستخدام ffmpeg
 * @param {string} text - النص المراد تحويله
 * @returns {Promise<Buffer>} - بيانات الفيديو MP4
 */
function renderBlinkingVideoWithFfmpeg(text) {
    return new Promise((resolve, reject) => {
        // مسار الخط حسب نظام التشغيل
        const fontPath = process.platform === 'win32'
            ? 'C:/Windows/Fonts/arialbd.ttf'
            : '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

        // ترميز النص لـ ffmpeg
        const escapeDrawtextText = (s) => s
            .replace(/\\/g, '\\\\')
            .replace(/:/g, '\\:')
            .replace(/,/g, '\\,')
            .replace(/'/g, "\\'")
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]')
            .replace(/%/g, '\\%');

        const safeText = escapeDrawtextText(text);
        const safeFontPath = process.platform === 'win32'
            ? fontPath.replace(/\\/g, '/').replace(':', '\\:')
            : fontPath;

        // مدة الدورة (بالثواني) وترتيب الألوان
        const cycle = 0.3;      // مدة الدورة الواحدة
        const dur = 1.8;        // المدة الإجمالية (6 دورات)

        // الأحمر (0-0.1 ثانية)
        const drawRed = `drawtext=fontfile='${safeFontPath}':text='${safeText}':fontcolor=red:borderw=2:bordercolor=black@0.6:fontsize=56:x=(w-text_w)/2:y=(h-text_h)/2:enable='lt(mod(t\,${cycle})\,0.1)'`;
        // الأزرق (0.1-0.2 ثانية)
        const drawBlue = `drawtext=fontfile='${safeFontPath}':text='${safeText}':fontcolor=blue:borderw=2:bordercolor=black@0.6:fontsize=56:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(mod(t\,${cycle})\,0.1\,0.2)'`;
        // الأخضر (0.2-0.3 ثانية)
        const drawGreen = `drawtext=fontfile='${safeFontPath}':text='${safeText}':fontcolor=green:borderw=2:bordercolor=black@0.6:fontsize=56:x=(w-text_w)/2:y=(h-text_h)/2:enable='gte(mod(t\,${cycle})\,0.2)'`;

        const filter = `${drawRed},${drawBlue},${drawGreen}`;

        const args = [
            '-y',
            '-f', 'lavfi',
            '-i', `color=c=black:s=512x512:d=${dur}:r=20`,
            '-vf', filter,
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart+frag_keyframe+empty_moov',
            '-t', String(dur),
            '-f', 'mp4',
            'pipe:1'
        ];

        const ff = spawn('ffmpeg', args);
        const chunks = [];
        const errors = [];
        ff.stdout.on('data', d => chunks.push(d));
        ff.stderr.on('data', e => errors.push(e));
        ff.on('error', reject);
        ff.on('close', code => {
            if (code === 0) return resolve(Buffer.concat(chunks));
            reject(new Error(Buffer.concat(errors).toString() || `ffmpeg exited with code ${code}`));
        });
    });
}