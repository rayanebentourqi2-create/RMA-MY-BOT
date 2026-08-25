const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const { toAudio } = require('../lib/converter');

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

async function tryRequest(getter, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await getter();
        } catch (err) {
            lastError = err;
            if (attempt < attempts) {
                await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
    }
    throw lastError;
}

// EliteProTech API - الأساسي
async function getEliteProTechDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(youtubeUrl)}&format=mp3`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.success && res?.data?.downloadURL) {
        return {
            download: res.data.downloadURL,
            title: res.data.title
        };
    }
    throw new Error('EliteProTech لم يعد رابط تحميل');
}

async function getYupraDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.success && res?.data?.data?.download_url) {
        return {
            download: res.data.data.download_url,
            title: res.data.data.title,
            thumbnail: res.data.data.thumbnail
        };
    }
    throw new Error('Yupra لم يعد رابط تحميل');
}

async function getOkatsuDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.dl) {
        return {
            download: res.data.dl,
            title: res.data.title,
            thumbnail: res.data.thumb
        };
    }
    throw new Error('Okatsu لم يعد رابط تحميل');
}

async function songCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        
        if (!text) {
            await sock.sendMessage(chatId, { 
                text: '🎵 *أمر تحميل الأغاني - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.اغنية <اسم الأغنية أو رابط يوتيوب>`\n\n📝 *أمثلة:*\n`.اغنية عبد الحليم حبيبها`\n`.اغنية https://youtu.be/xxxxx`\n\n✨ *سيتم تحميل الأغنية بصيغة MP3*'
            }, { quoted: message });
            return;
        }

        // إظهار تفاعل "جاري البحث"
        await sock.sendMessage(chatId, {
            react: { text: '🎵', key: message.key }
        });

        let video;
        if (text.includes('youtube.com') || text.includes('youtu.be')) {
            video = { url: text };
        } else {
            const search = await yts(text);
            if (!search || !search.videos.length) {
                await sock.sendMessage(chatId, { 
                    text: '❌ *لم يتم العثور على نتائج!*\n📌 حاول باستخدام كلمات بحث مختلفة.'
                }, { quoted: message });
                return;
            }
            video = search.videos[0];
        }

        // إرسال معلومات الأغنية
        await sock.sendMessage(chatId, {
            image: { url: video.thumbnail },
            caption: `╭━━━≪•🎵 *جـاري الـتـحـمـيـل* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🎤 *العنوان:* ${video.title}
┃⏱️ *المدة:* ${video.timestamp}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`
        }, { quoted: message });

        // محاولة التحميل من عدة APIs
        let audioData;
        let audioBuffer;
        let downloadSuccess = false;
        
        const apiMethods = [
            { name: 'EliteProTech', method: () => getEliteProTechDownloadByUrl(video.url) },
            { name: 'Yupra', method: () => getYupraDownloadByUrl(video.url) },
            { name: 'Okatsu', method: () => getOkatsuDownloadByUrl(video.url) }
        ];
        
        for (const apiMethod of apiMethods) {
            try {
                audioData = await apiMethod.method();
                const audioUrl = audioData.download || audioData.dl || audioData.url;
                
                if (!audioUrl) {
                    console.log(`${apiMethod.name} لم يعد رابط تحميل، نجرب التالي...`);
                    continue;
                }
                
                try {
                    const audioResponse = await axios.get(audioUrl, {
                        responseType: 'arraybuffer',
                        timeout: 90000,
                        maxContentLength: Infinity,
                        maxBodyLength: Infinity,
                        decompress: true,
                        validateStatus: s => s >= 200 && s < 400,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Accept': '*/*',
                            'Accept-Encoding': 'identity'
                        }
                    });
                    audioBuffer = Buffer.from(audioResponse.data);
                    
                    if (audioBuffer && audioBuffer.length > 0) {
                        downloadSuccess = true;
                        break;
                    }
                } catch (downloadErr) {
                    const statusCode = downloadErr.response?.status || downloadErr.status;
                    if (statusCode === 451) {
                        console.log(`التحميل محظور (451) من ${apiMethod.name}, نجرب التالي...`);
                        continue;
                    }
                    
                    try {
                        const audioResponse = await axios.get(audioUrl, {
                            responseType: 'stream',
                            timeout: 90000,
                            maxContentLength: Infinity,
                            maxBodyLength: Infinity,
                            validateStatus: s => s >= 200 && s < 400,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                'Accept': '*/*',
                                'Accept-Encoding': 'identity'
                            }
                        });
                        const chunks = [];
                        await new Promise((resolve, reject) => {
                            audioResponse.data.on('data', c => chunks.push(c));
                            audioResponse.data.on('end', resolve);
                            audioResponse.data.on('error', reject);
                        });
                        audioBuffer = Buffer.concat(chunks);
                        
                        if (audioBuffer && audioBuffer.length > 0) {
                            downloadSuccess = true;
                            break;
                        }
                    } catch (streamErr) {
                        console.log(`فشل تحميل الدفق من ${apiMethod.name}:`, streamErr.message);
                        continue;
                    }
                }
            } catch (apiErr) {
                console.log(`${apiMethod.name} فشل:`, apiErr.message);
                continue;
            }
        }
        
        if (!downloadSuccess || !audioBuffer) {
            throw new Error('جميع مصادر التحميل فشلت. قد يكون المحتوى غير متاح في منطقتك.');
        }

        // تحويل إلى MP3 إذا لزم الأمر
        let finalBuffer = audioBuffer;
        let finalMimetype = 'audio/mpeg';
        let finalExtension = 'mp3';

        // الكشف عن تنسيق الملف
        const firstBytes = audioBuffer.slice(0, 12);
        const hexSignature = firstBytes.toString('hex');
        const asciiSignature = firstBytes.toString('ascii', 4, 8);
        
        let fileExtension = 'mp3';
        
        if (asciiSignature === 'ftyp' || hexSignature.startsWith('000000')) {
            const ftypBox = audioBuffer.slice(4, 8).toString('ascii');
            if (ftypBox === 'ftyp') {
                fileExtension = 'm4a';
            }
        } else if (audioBuffer.toString('ascii', 0, 3) === 'ID3' || 
                   (audioBuffer[0] === 0xFF && (audioBuffer[1] & 0xE0) === 0xE0)) {
            fileExtension = 'mp3';
        } else if (audioBuffer.toString('ascii', 0, 4) === 'OggS') {
            fileExtension = 'ogg';
        } else {
            fileExtension = 'm4a';
        }

        if (fileExtension !== 'mp3') {
            try {
                finalBuffer = await toAudio(audioBuffer, fileExtension);
                if (!finalBuffer || finalBuffer.length === 0) {
                    throw new Error('التحويل أنتج ملف فارغ');
                }
            } catch (convErr) {
                throw new Error(`فشل تحويل إلى MP3: ${convErr.message}`);
            }
        }

        // إرسال الأغنية
        const title = (audioData?.title || video.title || 'اغنية').replace(/[^\w\s-]/g, '');
        
        await sock.sendMessage(chatId, {
            audio: finalBuffer,
            mimetype: finalMimetype,
            fileName: `${title}.${finalExtension}`,
            ptt: false
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

        // تنظيف الملفات المؤقتة
        try {
            const tempDir = path.join(__dirname, '../temp');
            if (fs.existsSync(tempDir)) {
                const files = fs.readdirSync(tempDir);
                const now = Date.now();
                files.forEach(file => {
                    const filePath = path.join(tempDir, file);
                    try {
                        const stats = fs.statSync(filePath);
                        if (now - stats.mtimeMs > 10000) {
                            if (file.endsWith('.mp3') || file.endsWith('.m4a') || /^\d+\.(mp3|m4a)$/.test(file)) {
                                fs.unlinkSync(filePath);
                            }
                        }
                    } catch (e) {}
                });
            }
        } catch (cleanupErr) {}

    } catch (err) {
        console.error('خطأ في أمر الأغنية:', err);
        
        let errorMessage = '❌ *فشل تحميل الأغنية!*\n';
        if (err.message && err.message.includes('blocked')) {
            errorMessage += '🔒 المحتوى محظور أو غير متاح في منطقتك.';
        } else if (err.response?.status === 451 || err.status === 451) {
            errorMessage += '🔒 المحتوى غير متاح بسبب قيود قانونية أو حظر إقليمي.';
        } else if (err.message && err.message.includes('All download sources failed')) {
            errorMessage += '⚠️ جميع مصادر التحميل فشلت. قد يكون المحتوى محذوفاً أو غير متاح.';
        } else {
            errorMessage += '⚠️ حدث خطأ أثناء التحميل. يرجى المحاولة لاحقاً.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage 
        }, { quoted: message });
    }
}

module.exports = songCommand;