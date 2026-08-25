const { ttdl } = require("ruhend-scraper");
const axios = require('axios');

// تخزين معرفات الرسائل المعالجة لمنع التكرار
const processedMessages = new Set();

async function tiktokCommand(sock, chatId, message) {
    try {
        // التحقق من معالجة الرسالة مسبقاً
        if (processedMessages.has(message.key.id)) {
            return;
        }
        
        processedMessages.add(message.key.id);
        
        // حذف المعرفات القديمة بعد 5 دقائق
        setTimeout(() => {
            processedMessages.delete(message.key.id);
        }, 5 * 60 * 1000);

        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        
        if (!text) {
            return await sock.sendMessage(chatId, { 
                text: "📱 *أمر تحميل تيك توك - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.تيك توك <رابط الفيديو>`\n\n📝 *مثال:*\n`.تيك توك https://www.tiktok.com/@user/video/123456789`\n\n✨ *سيتم تحميل الفيديو بجودة عالية*"
            }, { quoted: message });
        }

        // استخراج الرابط من الأمر
        const url = text.split(' ').slice(1).join(' ').trim();
        
        if (!url) {
            return await sock.sendMessage(chatId, { 
                text: "🔗 *الرجاء إدخال رابط تيك توك صحيح!*\n\nمثال: `.تيك توك https://www.tiktok.com/@user/video/123456789`"
            }, { quoted: message });
        }

        // التحقق من صحة رابط تيك توك
        const tiktokPatterns = [
            /https?:\/\/(?:www\.)?tiktok\.com\//,
            /https?:\/\/(?:vm\.)?tiktok\.com\//,
            /https?:\/\/(?:vt\.)?tiktok\.com\//,
            /https?:\/\/(?:www\.)?tiktok\.com\/@/,
            /https?:\/\/(?:www\.)?tiktok\.com\/t\//
        ];

        const isValidUrl = tiktokPatterns.some(pattern => pattern.test(url));
        
        if (!isValidUrl) {
            return await sock.sendMessage(chatId, { 
                text: "❌ *رابط غير صالح!*\nالرجاء إدخال رابط فيديو تيك توك صحيح."
            }, { quoted: message });
        }

        // إظهار تفاعل "جاري التحميل"
        await sock.sendMessage(chatId, {
            react: { text: '📱', key: message.key }
        });

        // إرسال رسالة "جاري المعالجة"
        const processingMsg = await sock.sendMessage(chatId, { 
            text: '📱 *جاري تحميل فيديو تيك توك...*\n⏳ يرجى الانتظار، قد يستغرق هذا بضع ثوانٍ.'
        }, { quoted: message });

        try {
            // استخدام Siputzx API
            const apiUrl = `https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(url)}`;

            let videoUrl = null;
            let audioUrl = null;
            let title = null;
            let author = null;

            // استدعاء Siputzx API
            try {
                const response = await axios.get(apiUrl, { 
                    timeout: 15000,
                    headers: {
                        'accept': '*/*',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (response.data && response.data.status) {
                    if (response.data.data) {
                        if (response.data.data.urls && Array.isArray(response.data.data.urls) && response.data.data.urls.length > 0) {
                            videoUrl = response.data.data.urls[0];
                            title = response.data.data.metadata?.title || "فيديو تيك توك";
                            author = response.data.data.metadata?.author || "";
                        } else if (response.data.data.video_url) {
                            videoUrl = response.data.data.video_url;
                            title = response.data.data.metadata?.title || "فيديو تيك توك";
                            author = response.data.data.metadata?.author || "";
                        } else if (response.data.data.url) {
                            videoUrl = response.data.data.url;
                            title = response.data.data.metadata?.title || "فيديو تيك توك";
                            author = response.data.data.metadata?.author || "";
                        } else if (response.data.data.download_url) {
                            videoUrl = response.data.data.download_url;
                            title = response.data.data.metadata?.title || "فيديو تيك توك";
                            author = response.data.data.metadata?.author || "";
                        } else {
                            throw new Error("لم يتم العثور على رابط الفيديو");
                        }
                    } else {
                        throw new Error("رد غير صحيح من API");
                    }
                } else {
                    throw new Error("رد غير صحيح من API");
                }
            } catch (apiError) {
                console.error(`Siputzx API فشل: ${apiError.message}`);
            }

            // إذا فشل Siputzx، جرب طريقة ttdl
            if (!videoUrl) {
                try {
                    let downloadData = await ttdl(url);
                    if (downloadData && downloadData.data && downloadData.data.length > 0) {
                        const mediaData = downloadData.data;
                        for (let i = 0; i < Math.min(20, mediaData.length); i++) {
                            const media = mediaData[i];
                            const mediaUrl = media.url;
                            const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(mediaUrl) || media.type === 'video';

                            // حذف رسالة "جاري المعالجة"
                            await sock.sendMessage(chatId, { delete: processingMsg.key });

                            if (isVideo) {
                                await sock.sendMessage(chatId, {
                                    video: { url: mediaUrl },
                                    mimetype: "video/mp4",
                                    caption: "━━━━━━━━━━━━━━━━━━━━━\n> 📥 *تم التحميل بواسطة JAWAD.BOT*"
                                }, { quoted: message });
                            } else {
                                await sock.sendMessage(chatId, {
                                    image: { url: mediaUrl },
                                    caption: "━━━━━━━━━━━━━━━━━━━━━\n> 📥 *تم التحميل بواسطة JAWAD.BOT*"
                                }, { quoted: message });
                            }
                            
                            await sock.sendMessage(chatId, {
                                react: { text: '✅', key: message.key }
                            });
                            return;
                        }
                    }
                } catch (ttdlError) {
                    console.error("ttdl فشل أيضاً:", ttdlError.message);
                }
            }

            // حذف رسالة "جاري المعالجة"
            await sock.sendMessage(chatId, { delete: processingMsg.key });

            // إرسال الفيديو إذا حصلنا على رابط
            if (videoUrl) {
                try {
                    // تحميل الفيديو
                    const videoResponse = await axios.get(videoUrl, {
                        responseType: 'arraybuffer',
                        timeout: 60000,
                        maxContentLength: 100 * 1024 * 1024,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Accept': 'video/mp4,video/*,*/*;q=0.9',
                            'Accept-Language': 'en-US,en;q=0.9',
                            'Referer': 'https://www.tiktok.com/'
                        }
                    });
                    
                    const videoBuffer = Buffer.from(videoResponse.data);
                    
                    const caption = `╭━━━≪•📱 *تـيـك تـوك* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
${author ? `┃👤 *المستخدم:* ${author}` : ''}
┃📝 *العنوان:* ${title || 'فيديو تيك توك'}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
                    
                    await sock.sendMessage(chatId, {
                        video: videoBuffer,
                        mimetype: "video/mp4",
                        caption: caption
                    }, { quoted: message });

                    // إظهار تفاعل النجاح
                    await sock.sendMessage(chatId, {
                        react: { text: '✅', key: message.key }
                    });
                    return;
                    
                } catch (downloadError) {
                    console.error(`فشل تحميل الفيديو: ${downloadError.message}`);
                    // محاولة إرسال الرابط مباشرة
                    try {
                        const caption = `╭━━━≪•📱 *تـيـك تـوك* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
${author ? `┃👤 *المستخدم:* ${author}` : ''}
┃📝 *العنوان:* ${title || 'فيديو تيك توك'}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
                        
                        await sock.sendMessage(chatId, {
                            video: { url: videoUrl },
                            mimetype: "video/mp4",
                            caption: caption
                        }, { quoted: message });
                        
                        await sock.sendMessage(chatId, {
                            react: { text: '✅', key: message.key }
                        });
                        return;
                    } catch (urlError) {
                        console.error(`طريقة الرابط فشلت أيضاً: ${urlError.message}`);
                    }
                }
            }

            // إذا وصلنا هنا، جميع الطرق فشلت
            return await sock.sendMessage(chatId, { 
                text: "❌ *فشل تحميل فيديو تيك توك!*\n\n⚠️ جميع محاولات التحميل فشلت. يرجى المحاولة برابط آخر أو التحقق من توفر الفيديو."
            }, { quoted: message });
            
        } catch (error) {
            console.error('خطأ في تحميل تيك توك:', error);
            await sock.sendMessage(chatId, { 
                text: "❌ *فشل تحميل الفيديو!*\n⚠️ يرجى المحاولة برابط آخر."
            }, { quoted: message });
        }
    } catch (error) {
        console.error('خطأ في أمر تيك توك:', error);
        await sock.sendMessage(chatId, { 
            text: "❌ *حدث خطأ!*\n⚠️ عذراً، حدث خطأ أثناء معالجة الطلب. يرجى المحاولة لاحقاً."
        }, { quoted: message });
    }
}

module.exports = tiktokCommand;