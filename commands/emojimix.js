const fetch = require('node-fetch');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const { promisify } = require('util');
const execPromise = promisify(exec);

// المجلد المؤقت
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function emojimixCommand(sock, chatId, msg) {
    try {
        // الحصول على النص بعد الأمر
        const text = msg.message?.conversation?.trim() || 
                    msg.message?.extendedTextMessage?.text?.trim() || '';
        
        const args = text.split(' ').slice(1);
        
        if (!args[0]) {
            await sock.sendMessage(chatId, { 
                text: '🎨 *مزج الإيموجيات - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.مزج 😎+🥰`\n\n📝 *أمثلة:*\n`.مزج 😂+😍`\n`.مزج 🐱+🐶`\n`.مزج 🔥+💙`\n\n✨ *قم بمزج إيموجيين معاً لإنشاء ملصق فريد*'
            }, { quoted: msg });
            return;
        }

        if (!text.includes('+')) {
            await sock.sendMessage(chatId, { 
                text: '❌ *خطأ!*\n✳️ افصل بين الإيموجيين بعلامة *+*\n\n📌 مثال: `.مزج 😎+🥰`' 
            }, { quoted: msg });
            return;
        }

        let [emoji1, emoji2] = args[0].split('+').map(e => e.trim());

        // التحقق من صحة الإيموجيات
        if (!emoji1 || !emoji2) {
            await sock.sendMessage(chatId, { 
                text: '❌ *خطأ!*\n⚠️ يرجى إدخال إيموجيين صحيحين.\n📌 مثال: `.مزج 😎+🥰`' 
            }, { quoted: msg });
            return;
        }

        // إظهار تفاعل "جاري المزج"
        await sock.sendMessage(chatId, {
            react: { text: '🎨', key: msg.key }
        });

        // إرسال رسالة "جاري المزج"
        const processingMsg = await sock.sendMessage(chatId, { 
            text: `🎨 *جاري مزج الإيموجيات...*\n${emoji1} + ${emoji2}\n⏳ يرجى الانتظار`
        }, { quoted: msg });

        // استخدام Tenor API
        const url = `https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            await sock.sendMessage(chatId, { delete: processingMsg.key });
            await sock.sendMessage(chatId, { 
                text: '❌ *لا يمكن مزج هذه الإيموجيات!*\n⚠️ حاول باستخدام إيموجيات مختلفة.\n\n📌 *إيموجيات مقترحة:*\n😀 😎 🥰 😂 🥺 😍 🐱 🐶 🔥 💙 ❤️' 
            }, { quoted: msg });
            return;
        }

        // الحصول على رابط النتيجة
        const imageUrl = data.results[0].url;

        // إنشاء أسماء ملفات مؤقتة
        const tempFile = path.join(TEMP_DIR, `temp_${Date.now()}.png`);
        const outputFile = path.join(TEMP_DIR, `sticker_${Date.now()}.webp`);

        // تحميل وحفظ الصورة
        const imageResponse = await fetch(imageUrl);
        const buffer = await imageResponse.buffer();
        fs.writeFileSync(tempFile, buffer);

        // تحويل إلى WebP باستخدام ffmpeg
        const ffmpegCommand = `ffmpeg -i "${tempFile}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" "${outputFile}"`;
        
        await execPromise(ffmpegCommand);

        // التحقق من وجود ملف الإخراج
        if (!fs.existsSync(outputFile)) {
            throw new Error('فشل إنشاء ملف الملصق');
        }

        // حذف رسالة "جاري المزج"
        await sock.sendMessage(chatId, { delete: processingMsg.key });

        // قراءة ملف WebP
        const stickerBuffer = fs.readFileSync(outputFile);

        // إرسال الملصق
        await sock.sendMessage(chatId, { 
            sticker: stickerBuffer,
            caption: `🎨 *مزج الإيموجيات*\n${emoji1} + ${emoji2}\n━━━━━━━━━━━━━━━━━━━━━\n> 🤖 *JAWAD.BOT*`
        }, { quoted: msg });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: msg.key }
        });

        // تنظيف الملفات المؤقتة
        try {
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
        } catch (err) {
            console.error('خطأ في تنظيف الملفات المؤقتة:', err);
        }

    } catch (error) {
        console.error('خطأ في أمر مزج الإيموجيات:', error);
        
        let errorMessage = '❌ *فشل مزج الإيموجيات!*\n⚠️ تأكد من استخدام إيموجيات صحيحة.\n\n📌 مثال: `.مزج 😎+🥰`';
        
        if (error.message && error.message.includes('ffmpeg')) {
            errorMessage = '❌ *خطأ في ffmpeg!*\n⚠️ تأكد من تثبيت ffmpeg على النظام.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: msg });
    }
}

module.exports = emojimixCommand;