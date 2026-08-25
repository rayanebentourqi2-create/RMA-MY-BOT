const axios = require('axios');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const webp = require('node-webpmux');
const crypto = require('crypto');

const ANIMU_BASE = 'https://api.some-random-api.com/animu';

function normalizeType(input) {
    const lower = (input || '').toLowerCase();
    if (lower === 'facepalm' || lower === 'face_palm') return 'face-palm';
    if (lower === 'quote' || lower === 'animu-quote' || lower === 'animuquote') return 'quote';
    return lower;
}

async function sendAnimu(sock, chatId, message, type) {
    try {
        const endpoint = `${ANIMU_BASE}/${type}`;
        const res = await axios.get(endpoint);
        const data = res.data || {};

        // دالة تحويل الوسائط إلى ملصق
        async function convertMediaToSticker(mediaBuffer, isAnimated) {
            const tmpDir = path.join(process.cwd(), 'temp');
            if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

            const inputExt = isAnimated ? 'gif' : 'jpg';
            const input = path.join(tmpDir, `animu_${Date.now()}.${inputExt}`);
            const output = path.join(tmpDir, `animu_${Date.now()}.webp`);
            fs.writeFileSync(input, mediaBuffer);

            const ffmpegCmd = isAnimated 
                ? `ffmpeg -y -i "${input}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,fps=15" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 60 -compression_level 6 "${output}"`
                : `ffmpeg -y -i "${input}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${output}"`;

            await new Promise((resolve, reject) => {
                exec(ffmpegCmd, (err) => (err ? reject(err) : resolve()));
            });

            let webpBuffer = fs.readFileSync(output);

            // إضافة بيانات الملصق
            const img = new webp.Image();
            await img.load(webpBuffer);

            const json = {
                'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
                'sticker-pack-name': 'JAWAD.BOT - ملصقات أنمي',
                'sticker-pack-publisher': 'JAWAD.BOT',
                'emojis': ['🎌', '🇯🇵', '✨']
            };
            const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
            const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
            const exif = Buffer.concat([exifAttr, jsonBuffer]);
            exif.writeUIntLE(jsonBuffer.length, 14, 4);
            img.exif = exif;

            const finalBuffer = await img.save(null);

            try { fs.unlinkSync(input); } catch(e) {}
            try { fs.unlinkSync(output); } catch(e) {}
            return finalBuffer;
        }

        if (data.link) {
            const link = data.link;
            const lower = link.toLowerCase();
            const isGifLink = lower.endsWith('.gif');
            const isImageLink = lower.match(/\.(jpg|jpeg|png|webp)$/);

            // تحويل جميع الوسائط إلى ملصقات
            if (isGifLink || isImageLink) {
                try {
                    // إظهار تفاعل "جاري التحويل"
                    await sock.sendMessage(chatId, {
                        react: { text: '🔄', key: message.key }
                    });

                    const resp = await axios.get(link, {
                        responseType: 'arraybuffer',
                        timeout: 15000,
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });
                    const mediaBuf = Buffer.from(resp.data);
                    const stickerBuf = await convertMediaToSticker(mediaBuf, isGifLink);
                    await sock.sendMessage(
                        chatId,
                        { sticker: stickerBuf },
                        { quoted: message }
                    );
                    return;
                } catch (error) {
                    console.error('خطأ في تحويل الوسائط إلى ملصق:', error);
                }
            }

            // في حالة فشل التحويل، إرسال كصورة
            try {
                const typeNames = {
                    'nom': '🍜 يأكل',
                    'poke': '👉 ينكز',
                    'cry': '😢 يبكي',
                    'kiss': '💏 يقبل',
                    'pat': '🫂 يربت',
                    'hug': '🤗 يعانق',
                    'wink': '😉 يغمز',
                    'face-palm': '🤦 يضرب برأسه',
                    'quote': '💬 اقتباس'
                };
                const caption = `🎴 *أنمي - ${typeNames[type] || type}*\n📌 *JAWAD.BOT*`;
                
                await sock.sendMessage(
                    chatId,
                    { image: { url: link }, caption: caption },
                    { quoted: message }
                );
                return;
            } catch(e) {}
        }
        
        if (data.quote) {
            await sock.sendMessage(
                chatId,
                { text: `💬 *اقتباس أنمي*\n\n"${data.quote}"\n\n━═━═━━═━═━━═━═━\n🤖 JAWAD.BOT` },
                { quoted: message }
            );
            return;
        }

        await sock.sendMessage(
            chatId,
            { text: '❌ فشل في جلب محتوى الأنمي. يرجى المحاولة لاحقاً.' },
            { quoted: message }
        );
    } catch (error) {
        console.error('خطأ في sendAnimu:', error);
        await sock.sendMessage(
            chatId,
            { text: '❌ حدث خطأ أثناء جلب محتوى الأنمي.' },
            { quoted: message }
        );
    }
}

async function animeCommand(sock, chatId, message, args) {
    const subArg = args && args[0] ? args[0] : '';
    const sub = normalizeType(subArg);

    const supported = [
        'nom', 'poke', 'cry', 'kiss', 'pat', 'hug', 'wink', 'face-palm', 'quote'
    ];

    const typeNames = {
        'nom': '🍜 يأكل',
        'poke': '👉 ينكز',
        'cry': '😢 يبكي',
        'kiss': '💏 يقبل',
        'pat': '🫂 يربت',
        'hug': '🤗 يعانق',
        'wink': '😉 يغمز',
        'face-palm': '🤦 يضرب برأسه',
        'quote': '💬 اقتباس'
    };

    try {
        if (!sub) {
            const typesList = supported.map(t => `• ${t} - ${typeNames[t] || t}`).join('\n');
            await sock.sendMessage(chatId, { 
                text: `🎴 *أوامر الأنمي - JAWAD.BOT*\n\n📌 *الاستخدام:*\n.انمي <النوع>\n\n✨ *الأنواع المتاحة:*\n${typesList}\n\n📝 *مثال:*\n.انمي hug\n.انمي kiss` 
            }, { quoted: message });
            return;
        }

        if (!supported.includes(sub)) {
            await sock.sendMessage(chatId, { 
                text: `❌ *نوع غير مدعوم:* ${sub}\n\n📌 *الأنواع المتاحة:*\n${supported.map(t => `• ${t}`).join(', ')}` 
            }, { quoted: message });
            return;
        }

        // إظهار تفاعل "جاري التحميل"
        await sock.sendMessage(chatId, {
            react: { text: '🎴', key: message.key }
        });

        await sendAnimu(sock, chatId, message, sub);
    } catch (err) {
        console.error('خطأ في أمر الأنمي:', err);
        await sock.sendMessage(chatId, { 
            text: '❌ حدث خطأ أثناء جلب محتوى الأنمي. يرجى المحاولة لاحقاً.' 
        }, { quoted: message });
    }
}

module.exports = { animeCommand };