const axios = require('axios');
const yts = require('yt-search');

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
async function getEliteProTechVideoByUrl(youtubeUrl) {
    const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(youtubeUrl)}&format=mp4`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.success && res?.data?.downloadURL) {
        return {
            download: res.data.downloadURL,
            title: res.data.title
        };
    }
    throw new Error('EliteProTech لم يعد رابط تحميل');
}

async function getYupraVideoByUrl(youtubeUrl) {
    const apiUrl = `https://api.yupra.my.id/api/downloader/ytmp4?url=${encodeURIComponent(youtubeUrl)}`;
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

async function getOkatsuVideoByUrl(youtubeUrl) {
    const apiUrl = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp4?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.result?.mp4) {
        return { download: res.data.result.mp4, title: res.data.result.title };
    }
    throw new Error('Okatsu لم يعد رابط تحميل');
}

async function videoCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();
        
        if (!searchQuery) {
            await sock.sendMessage(chatId, { 
                text: '🎬 *أمر تحميل الفيديو - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.فيديو <اسم الفيديو أو رابط يوتيوب>`\n\n📝 *أمثلة:*\n`.فيديو محمد عبده - أتحدى العالم`\n`.فيديو https://youtu.be/xxxxx`\n\n✨ *سيتم تحميل الفيديو بجودة عالية*'
            }, { quoted: message });
            return;
        }

        // إظهار تفاعل "جاري البحث"
        await sock.sendMessage(chatId, {
            react: { text: '🎬', key: message.key }
        });

        // تحديد ما إذا كان الإدخال رابط يوتيوب
        let videoUrl = '';
        let videoTitle = '';
        let videoThumbnail = '';
        
        if (searchQuery.startsWith('http://') || searchQuery.startsWith('https://')) {
            videoUrl = searchQuery;
        } else {
            // البحث عن الفيديو في يوتيوب
            await sock.sendMessage(chatId, { text: '🔍 *جاري البحث عن الفيديو...*\n⏳ يرجى الانتظار' }, { quoted: message });
            
            const { videos } = await yts(searchQuery);
            if (!videos || videos.length === 0) {
                await sock.sendMessage(chatId, { text: '❌ *لم يتم العثور على فيديو!*\n📌 حاول باستخدام كلمات بحث مختلفة.' }, { quoted: message });
                return;
            }
            videoUrl = videos[0].url;
            videoTitle = videos[0].title;
            videoThumbnail = videos[0].thumbnail;
        }

        // إرسال الصورة المصغرة فوراً
        try {
            const ytId = (videoUrl.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/) || [])[1];
            const thumb = videoThumbnail || (ytId ? `https://i.ytimg.com/vi/${ytId}/sddefault.jpg` : undefined);
            const captionTitle = videoTitle || searchQuery;
            if (thumb) {
                await sock.sendMessage(chatId, {
                    image: { url: thumb },
                    caption: `🎬 *${captionTitle.substring(0, 100)}*\n⏳ *جاري التحميل...*\n━━━━━━━━━━━━━━━━━━━━━\n> 🤖 *JAWAD.BOT*`
                }, { quoted: message });
            }
        } catch (e) { 
            console.error('[فيديو] خطأ في الصورة المصغرة:', e?.message || e); 
        }

        // التحقق من صحة رابط يوتيوب
        let urls = videoUrl.match(/(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch\?v=|v\/|embed\/|shorts\/|playlist\?list=)?)([a-zA-Z0-9_-]{11})/gi);
        if (!urls) {
            await sock.sendMessage(chatId, { text: '❌ *رابط غير صالح!*\n📌 هذا ليس رابط يوتيوب صحيحاً.' }, { quoted: message });
            return;
        }

        // محاولة تحميل الفيديو من عدة APIs
        let videoData;
        let downloadSuccess = false;
        
        const apiMethods = [
            { name: 'EliteProTech', method: () => getEliteProTechVideoByUrl(videoUrl) },
            { name: 'Yupra', method: () => getYupraVideoByUrl(videoUrl) },
            { name: 'Okatsu', method: () => getOkatsuVideoByUrl(videoUrl) }
        ];
        
        for (const apiMethod of apiMethods) {
            try {
                videoData = await apiMethod.method();
                const videoUrl_check = videoData.download || videoData.dl || videoData.url;
                
                if (!videoUrl_check) {
                    console.log(`${apiMethod.name} لم يعد رابط تحميل، نجرب التالي...`);
                    continue;
                }
                
                downloadSuccess = true;
                break;
            } catch (apiErr) {
                console.log(`${apiMethod.name} فشل:`, apiErr.message);
                continue;
            }
        }
        
        if (!downloadSuccess || !videoData) {
            throw new Error('جميع مصادر التحميل فشلت. قد يكون المحتوى غير متاح في منطقتك.');
        }

        // إرسال الفيديو
        const videoTitleFinal = (videoData.title || videoTitle || 'فيديو').replace(/[^\w\s-]/g, '');
        await sock.sendMessage(chatId, {
            video: { url: videoData.download || videoData.dl || videoData.url },
            mimetype: 'video/mp4',
            fileName: `${videoTitleFinal}.mp4`,
            caption: `🎬 *${videoTitleFinal.substring(0, 80)}*\n\n━━━━━━━━━━━━━━━━━━━━━\n> 📥 *تم التحميل بواسطة JAWAD.BOT*`
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('[فيديو] خطأ:', error?.message || error);
        
        let errorMessage = '❌ *فشل تحميل الفيديو!*\n\n';
        if (error.message && error.message.includes('blocked')) {
            errorMessage += '🔒 المحتوى محظور أو غير متاح في منطقتك.';
        } else if (error.response?.status === 451 || error.status === 451) {
            errorMessage += '🔒 المحتوى غير متاح بسبب قيود قانونية أو حظر إقليمي.';
        } else if (error.message && error.message.includes('All download sources failed')) {
            errorMessage += '⚠️ جميع مصادر التحميل فشلت. قد يكون الفيديو محذوفاً أو غير متاح.';
        } else {
            errorMessage += '⚠️ حدث خطأ أثناء التحميل. يرجى المحاولة لاحقاً.';
        }
        
        errorMessage += '\n\n📌 *نصيحة:* حاول باستخدام رابط مباشر أو اسم أغنية مختلفة.';
        
        await sock.sendMessage(chatId, { 
            text: errorMessage 
        }, { quoted: message });
    }
}

module.exports = videoCommand;