const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { uploadImage } = require('../lib/uploadImage');

async function getQuotedOrOwnImageUrl(sock, message) {
    // 1) صورة مقتبسة (أولوية أعلى)
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quoted?.imageMessage) {
        const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        return await uploadImage(buffer);
    }

    // 2) صورة في الرسالة الحالية
    if (message.message?.imageMessage) {
        const stream = await downloadContentFromMessage(message.message.imageMessage, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        return await uploadImage(buffer);
    }

    return null;
}

async function reminiCommand(sock, chatId, message, args) {
    try {
        let imageUrl = null;
        
        // التحقق من وجود رابط في المعاملات
        if (args.length > 0) {
            const url = args.join(' ');
            if (isValidUrl(url)) {
                imageUrl = url;
            } else {
                return sock.sendMessage(chatId, { 
                    text: '❌ *رابط غير صالح!*\n\n📌 *الاستخدام:*\n.تحسين https://example.com/image.jpg'
                }, { quoted: message });
            }
        } else {
            // محاولة الحصول على الصورة من الرسالة
            imageUrl = await getQuotedOrOwnImageUrl(sock, message);
            
            if (!imageUrl) {
                return sock.sendMessage(chatId, { 
                    text: '📸 *أمر تحسين الصور - JAWAD.BOT*\n\n📌 *الاستخدام:*\n• `.تحسين <رابط الصورة>`\n• قم بالرد على صورة مع `.تحسين`\n• أرسل صورة مع `.تحسين`\n\n📝 *مثال:*\n`.تحسين https://example.com/image.jpg`\n\n✨ *سيتم تحسين جودة الصورة باستخدام الذكاء الاصطناعي*'
                }, { quoted: message });
            }
        }

        // إظهار تفاعل "جاري المعالجة"
        await sock.sendMessage(chatId, {
            react: { text: '✨', key: message.key }
        });

        // إرسال رسالة "جاري التحسين"
        const processingMsg = await sock.sendMessage(chatId, { 
            text: '✨ *جاري تحسين الصورة...*\n⏳ يرجى الانتظار، قد يستغرق هذا 15-30 ثانية.'
        }, { quoted: message });

        // استدعاء واجهة Remini API
        const apiUrl = `https://api.princetechn.com/api/tools/remini?apikey=prince_tech_api_azfsbshfb&url=${encodeURIComponent(imageUrl)}`;
        
        const response = await axios.get(apiUrl, {
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        // حذف رسالة "جاري التحسين"
        await sock.sendMessage(chatId, { delete: processingMsg.key });

        if (response.data && response.data.success && response.data.result) {
            const result = response.data.result;
            
            if (result.image_url) {
                // تحميل الصورة المحسنة
                const imageResponse = await axios.get(result.image_url, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                });
                
                if (imageResponse.status === 200 && imageResponse.data) {
                    // إرسال الصورة المحسنة
                    const caption = `╭━━━≪•✨ *تـحـسـيـن الـصـورة* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃✅ *تم تحسين الصورة بنجاح!*
┃━━━━━━━━━━━━━━━━━━━━━
┃🤖 *تم التحسين بواسطة:* JAWAD.BOT
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
                    
                    await sock.sendMessage(chatId, {
                        image: imageResponse.data,
                        caption: caption
                    }, { quoted: message });
                    
                    // إظهار تفاعل النجاح
                    await sock.sendMessage(chatId, {
                        react: { text: '✅', key: message.key }
                    });
                } else {
                    throw new Error('فشل تحميل الصورة المحسنة');
                }
            } else {
                throw new Error(result.message || 'فشل تحسين الصورة');
            }
        } else {
            throw new Error('رد API غير صالح');
        }

    } catch (error) {
        console.error('خطأ في تحسين الصورة:', error.message);
        
        let errorMessage = '❌ *فشل تحسين الصورة!*\n';
        
        if (error.response?.status === 429) {
            errorMessage += '⏰ *تم الوصول للحد الأقصى!*\n⚠️ يرجى الانتظار ثم المحاولة مرة أخرى.';
        } else if (error.response?.status === 400) {
            errorMessage += '❌ *رابط صورة غير صالح!*\n⚠️ تأكد من أن الرابط指向 صورة صالحة.';
        } else if (error.response?.status === 500) {
            errorMessage += '🔧 *خطأ في الخادم!*\n⚠️ يرجى المحاولة لاحقاً.';
        } else if (error.code === 'ECONNABORTED') {
            errorMessage += '⏰ *انتهى الوقت!*\n⚠️ استغرق الطلب وقتاً طويلاً. حاول مرة أخرى.';
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            errorMessage += '🌐 *خطأ في الشبكة!*\n⚠️ يرجى التحقق من اتصالك بالإنترنت.';
        } else {
            errorMessage += '⚠️ يرجى المحاولة لاحقاً. تأكد من أن الصورة واضحة ومنسقة بشكل جيد.';
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage 
        }, { quoted: message });
    }
}

// دالة التحقق من صحة الرابط
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

module.exports = { reminiCommand };