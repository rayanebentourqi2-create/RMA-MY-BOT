const axios = require('axios');
const fs = require('fs');
const path = require('path');

// المجلد المؤقت
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function facebookCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const url = text.split(' ').slice(1).join(' ').trim();
        
        if (!url) {
            return await sock.sendMessage(chatId, { 
                text: "📘 *أمر تحميل فيديو فيسبوك - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.فيس <رابط الفيديو>`\n\n📝 *مثال:*\n`.فيس https://www.facebook.com/watch/?v=123456789`\n\n✨ *سيتم تحميل الفيديو بجودة عالية*"
            }, { quoted: message });
        }

        // التحقق من صحة رابط فيسبوك
        if (!url.includes('facebook.com') && !url.includes('fb.com')) {
            return await sock.sendMessage(chatId, { 
                text: "❌ *رابط غير صالح!*\n⚠️ هذا ليس رابط فيديو فيسبوك صحيحاً."
            }, { quoted: message });
        }

        // إظهار تفاعل "جاري التحميل"
        await sock.sendMessage(chatId, {
            react: { text: '📘', key: message.key }
        });

        // إرسال رسالة "جاري التحميل"
        const processingMsg = await sock.sendMessage(chatId, { 
            text: '📘 *جاري تحميل فيديو فيسبوك...*\n⏳ يرجى الانتظار، قد يستغرق هذا بضع ثوانٍ.'
        }, { quoted: message });

        // تحويل الرابط المختصر إلى الرابط النهائي
        let resolvedUrl = url;
        try {
            const res = await axios.get(url, { timeout: 20000, maxRedirects: 10, headers: { 'User-Agent': 'Mozilla/5.0' } });
            const possible = res?.request?.res?.responseUrl;
            if (possible && typeof possible === 'string') {
                resolvedUrl = possible;
            }
        } catch(e) {
            // استخدام الرابط الأصلي
        }

        // استخدام Hanggts API
        async function fetchFromApi(u) {
            const apiUrl = `https://api.hanggts.xyz/download/facebook?url=${encodeURIComponent(u)}`;
            
            try {
                const response = await axios.get(apiUrl, {
                    timeout: 20000,
                    headers: {
                        'accept': '*/*',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    maxRedirects: 5,
                    validateStatus: s => s >= 200 && s < 500
                });
                
                if (response.data) {
                    if (response.data.status === true || 
                        response.data.result || 
                        response.data.data || 
                        response.data.url || 
                        response.data.download || 
                        response.data.video) {
                        return { response, apiName: 'Hanggts API' };
                    }
                }
            } catch (error) {
                console.error(`Hanggts API فشل: ${error.message}`);
            }
            throw new Error('Hanggts API فشل');
        }

        // تجربة الرابط المحلول ثم الرابط الأصلي
        let apiResult;
        try {
            apiResult = await fetchFromApi(resolvedUrl);
        } catch(e) {
            apiResult = await fetchFromApi(url);
        }

        const response = apiResult.response;
        const data = response.data;

        let fbvid = null;
        let title = null;

        // معالجة رد Hanggts API
        if (data) {
            if (data.result) {
                if (data.result.media) {
                    fbvid = data.result.media.video_hd || data.result.media.video_sd;
                    title = data.result.info?.title || data.result.title || data.title || "فيديو فيسبوك";
                } else if (typeof data.result === 'object' && data.result.url) {
                    fbvid = data.result.url;
                    title = data.result.title || data.result.caption || data.title || "فيديو فيسبوك";
                } else if (typeof data.result === 'string' && data.result.startsWith('http')) {
                    fbvid = data.result;
                    title = data.title || "فيديو فيسبوك";
                } else if (data.result.download) {
                    fbvid = data.result.download;
                    title = data.result.title || data.title || "فيديو فيسبوك";
                } else if (data.result.video) {
                    fbvid = data.result.video;
                    title = data.result.title || data.title || "فيديو فيسبوك";
                }
            }
            
            if (!fbvid && data.data) {
                if (typeof data.data === 'object' && data.data.url) {
                    fbvid = data.data.url;
                    title = data.data.title || data.data.caption || data.title || "فيديو فيسبوك";
                } else if (typeof data.data === 'string' && data.data.startsWith('http')) {
                    fbvid = data.data;
                    title = data.title || "فيديو فيسبوك";
                } else if (Array.isArray(data.data) && data.data.length > 0) {
                    const hdVideo = data.data.find(item => (item.quality === 'HD' || item.quality === 'high') && (item.format === 'mp4' || !item.format));
                    const sdVideo = data.data.find(item => (item.quality === 'SD' || item.quality === 'low') && (item.format === 'mp4' || !item.format));
                    fbvid = hdVideo?.url || sdVideo?.url || data.data[0]?.url;
                    title = hdVideo?.title || sdVideo?.title || data.data[0]?.title || data.title || "فيديو فيسبوك";
                } else if (data.data.download) {
                    fbvid = data.data.download;
                    title = data.data.title || data.title || "فيديو فيسبوك";
                } else if (data.data.video) {
                    fbvid = data.data.video;
                    title = data.data.title || data.title || "فيديو فيسبوك";
                }
            }
            
            if (!fbvid && data.url) {
                fbvid = data.url;
                title = data.title || data.caption || "فيديو فيسبوك";
            }
            
            if (!fbvid && data.download) {
                fbvid = data.download;
                title = data.title || "فيديو فيسبوك";
            }
            
            if (!fbvid && data.video) {
                fbvid = typeof data.video === 'string' ? data.video : data.video.url;
                title = data.title || data.video?.title || "فيديو فيسبوك";
            }
        }

        if (!fbvid) {
            await sock.sendMessage(chatId, { delete: processingMsg.key });
            return await sock.sendMessage(chatId, { 
                text: '❌ *فشل الحصول على رابط الفيديو!*\n\n📌 *الأسباب المحتملة:*\n• الفيديو خاص أو محذوف\n• الرابط غير صحيح\n• الفيديو غير متاح للتحميل\n\n💡 جرب رابط فيديو آخر.'
            }, { quoted: message });
        }

        // حذف رسالة "جاري التحميل"
        await sock.sendMessage(chatId, { delete: processingMsg.key });

        // محاولة إرسال الفيديو بالرابط أولاً
        try {
            const caption = `╭━━━≪•📘 *فـيـديـوهـات فـيـسـبـوك* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
${title ? `┃📝 *العنوان:* ${title.substring(0, 50)}` : '┃📝 فيديو فيسبوك'}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
            
            await sock.sendMessage(chatId, {
                video: { url: fbvid },
                mimetype: "video/mp4",
                caption: caption
            }, { quoted: message });
            
            // إظهار تفاعل النجاح
            await sock.sendMessage(chatId, {
                react: { text: '✅', key: message.key }
            });
            
            return;
        } catch (urlError) {
            console.error(`طريقة الرابط فشلت: ${urlError.message}`);
            
            // الاحتياط: تحميل الفيديو كـ Buffer
            try {
                const tempFile = path.join(TEMP_DIR, `fb_${Date.now()}.mp4`);

                const videoResponse = await axios({
                    method: 'GET',
                    url: fbvid,
                    responseType: 'stream',
                    timeout: 60000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Referer': 'https://www.facebook.com/'
                    }
                });

                const writer = fs.createWriteStream(tempFile);
                videoResponse.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                if (!fs.existsSync(tempFile) || fs.statSync(tempFile).size === 0) {
                    throw new Error('فشل تحميل الفيديو');
                }

                const caption = `╭━━━≪•📘 *فـيـديـوهـات فـيـسـبـوك* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
${title ? `┃📝 *العنوان:* ${title.substring(0, 50)}` : '┃📝 فيديو فيسبوك'}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
                
                await sock.sendMessage(chatId, {
                    video: { url: tempFile },
                    mimetype: "video/mp4",
                    caption: caption
                }, { quoted: message });

                // تنظيف الملف المؤقت
                try { fs.unlinkSync(tempFile); } catch(e) {}
                
                await sock.sendMessage(chatId, {
                    react: { text: '✅', key: message.key }
                });
                
                return;
            } catch (bufferError) {
                console.error(`طريقة Buffer فشلت أيضاً: ${bufferError.message}`);
                throw new Error('فشلت جميع طرق التحميل');
            }
        }

    } catch (error) {
        console.error('خطأ في أمر فيسبوك:', error);
        await sock.sendMessage(chatId, { 
            text: "❌ *حدث خطأ!*\n⚠️ قد تكون واجهة API معطلة حالياً.\n💡 حاول مرة أخرى لاحقاً.\n\n📝 خطأ: " + error.message
        }, { quoted: message });
    }
}

module.exports = facebookCommand;