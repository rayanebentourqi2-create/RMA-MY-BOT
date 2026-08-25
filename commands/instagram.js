const { igdl } = require("ruhend-scraper");

// تخزين معرفات الرسائل المعالجة لمنع التكرار
const processedMessages = new Set();

// دالة استخراج روابط الوسائط الفريدة
function extractUniqueMedia(mediaData) {
    const uniqueMedia = [];
    const seenUrls = new Set();
    
    for (const media of mediaData) {
        if (!media.url) continue;
        
        if (!seenUrls.has(media.url)) {
            seenUrls.add(media.url);
            uniqueMedia.push(media);
        }
    }
    
    return uniqueMedia;
}

// دالة التحقق من صحة رابط الوسائط
function isValidMediaUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    return url.includes('cdninstagram.com') || 
           url.includes('instagram') || 
           url.includes('http');
}

async function instagramCommand(sock, chatId, message) {
    try {
        // التحقق من معالجة الرسالة مسبقاً
        if (processedMessages.has(message.key.id)) {
            return;
        }
        
        processedMessages.add(message.key.id);
        
        setTimeout(() => {
            processedMessages.delete(message.key.id);
        }, 5 * 60 * 1000);

        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        
        if (!text) {
            return await sock.sendMessage(chatId, { 
                text: "📸 *أمر تحميل انستغرام - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.انستغرام <رابط المنشور>`\n\n📝 *مثال:*\n`.انستغرام https://www.instagram.com/p/xxxxx`\n\n✨ *سيتم تحميل جميع الصور والفيديوهات من المنشور*"
            }, { quoted: message });
        }

        // التحقق من صحة رابط انستغرام
        const instagramPatterns = [
            /https?:\/\/(?:www\.)?instagram\.com\//,
            /https?:\/\/(?:www\.)?instagr\.am\//,
            /https?:\/\/(?:www\.)?instagram\.com\/p\//,
            /https?:\/\/(?:www\.)?instagram\.com\/reel\//,
            /https?:\/\/(?:www\.)?instagram\.com\/tv\//
        ];

        const isValidUrl = instagramPatterns.some(pattern => pattern.test(text));
        
        if (!isValidUrl) {
            return await sock.sendMessage(chatId, { 
                text: "❌ *رابط غير صالح!*\n⚠️ هذا ليس رابط انستغرام صحيحاً.\n📌 يرجى تقديم رابط منشور أو فيديو انستغرام صحيح."
            }, { quoted: message });
        }

        // إظهار تفاعل "جاري التحميل"
        await sock.sendMessage(chatId, {
            react: { text: '📸', key: message.key }
        });

        // إرسال رسالة "جاري المعالجة"
        const processingMsg = await sock.sendMessage(chatId, { 
            text: '📸 *جاري جلب معلومات المنشور...*\n⏳ يرجى الانتظار'
        }, { quoted: message });

        const downloadData = await igdl(text);
        
        await sock.sendMessage(chatId, { delete: processingMsg.key });
        
        if (!downloadData || !downloadData.data || downloadData.data.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: "❌ *لم يتم العثور على وسائط!*\n⚠️ المنشور قد يكون خاصاً أو الرابط غير صحيح.\n📌 تأكد من أن المنشور عام ويمكن الوصول إليه."
            }, { quoted: message });
        }

        const mediaData = downloadData.data;
        const uniqueMedia = extractUniqueMedia(mediaData);
        const mediaToDownload = uniqueMedia.slice(0, 20);
        
        if (mediaToDownload.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: "❌ *لا توجد وسائط صالحة للتحميل!*\n⚠️ المنشور قد يكون خاصاً أو أداة التحميل فشلت."
            }, { quoted: message });
        }

        // إرسال رسالة بعدد الوسائط
        await sock.sendMessage(chatId, { 
            text: `📸 *جاري تحميل ${mediaToDownload.length} وسائط من انستغرام...*\n⏳ سيتم إرسالها تباعاً.`
        }, { quoted: message });

        let videoCount = 0;
        let imageCount = 0;
        
        // تحميل جميع الوسائط
        for (let i = 0; i < mediaToDownload.length; i++) {
            try {
                const media = mediaToDownload[i];
                const mediaUrl = media.url;

                const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(mediaUrl) || 
                              media.type === 'video' || 
                              text.includes('/reel/') || 
                              text.includes('/tv/');

                const caption = `╭━━━≪•📸 *انـسـتـغـرام* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃📥 *تم التحميل بواسطة JAWAD.BOT*
┃📎 *الوسائط:* ${i + 1}/${mediaToDownload.length}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

                if (isVideo) {
                    await sock.sendMessage(chatId, {
                        video: { url: mediaUrl },
                        mimetype: "video/mp4",
                        caption: caption
                    }, { quoted: message });
                    videoCount++;
                } else {
                    await sock.sendMessage(chatId, {
                        image: { url: mediaUrl },
                        caption: caption
                    }, { quoted: message });
                    imageCount++;
                }
                
                if (i < mediaToDownload.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
            } catch (mediaError) {
                console.error(`خطأ في تحميل الوسائط ${i + 1}:`, mediaError);
            }
        }

        // إرسال ملخص التحميل
        await sock.sendMessage(chatId, { 
            text: `✅ *تم التحميل بنجاح!*\n\n📸 *الصور:* ${imageCount}\n🎥 *الفيديوهات:* ${videoCount}\n📊 *الإجمالي:* ${mediaToDownload.length} وسائط`
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر انستغرام:', error);
        await sock.sendMessage(chatId, { 
            text: "❌ *حدث خطأ!*\n⚠️ عذراً، حدث خطأ أثناء معالجة طلب انستغرام. يرجى المحاولة لاحقاً."
        }, { quoted: message });
    }
}

module.exports = instagramCommand;