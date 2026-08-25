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

module.exports = {
    name: 'removebg',
    alias: ['rmbg', 'nobg'],
    category: 'general',
    desc: 'Remove background from images',
    async exec(sock, message, args) {
        try {
            const chatId = message.key.remoteJid;
            let imageUrl = null;
            
            // التحقق من وجود رابط في المعاملات
            if (args.length > 0) {
                const url = args.join(' ');
                if (isValidUrl(url)) {
                    imageUrl = url;
                } else {
                    return sock.sendMessage(chatId, { 
                        text: '❌ *رابط غير صالح!*\n\n📌 *الاستخدام:*\n.ازالة الخلفية https://example.com/image.jpg' 
                    }, { quoted: message });
                }
            } else {
                // محاولة الحصول على الصورة من الرسالة
                imageUrl = await getQuotedOrOwnImageUrl(sock, message);
                
                if (!imageUrl) {
                    return sock.sendMessage(chatId, { 
                        text: '📸 *أمر إزالة الخلفية - JAWAD.BOT*\n\n📌 *الاستخدام:*\n• `.ازالة الخلفية <رابط الصورة>`\n• قم بالرد على صورة مع `.ازالة الخلفية`\n• أرسل صورة مع `.ازالة الخلفية`\n\n📝 *مثال:*\n`.ازالة الخلفية https://example.com/image.jpg`\n\n✨ *سيتم إزالة خلفية الصورة تلقائياً*'
                    }, { quoted: message });
                }
            }

            // إظهار تفاعل "جاري المعالجة"
            await sock.sendMessage(chatId, {
                react: { text: '🖼️', key: message.key }
            });

            // إرسال رسالة "جاري المعالجة"
            const processingMsg = await sock.sendMessage(chatId, { 
                text: '🖼️ *جاري إزالة خلفية الصورة...*\n⏳ يرجى الانتظار'
            }, { quoted: message });

            // استدعاء API إزالة الخلفية
            const apiUrl = `https://api.siputzx.my.id/api/iloveimg/removebg?image=${encodeURIComponent(imageUrl)}`;
            
            const response = await axios.get(apiUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            // حذف رسالة "جاري المعالجة"
            await sock.sendMessage(chatId, { delete: processingMsg.key });

            if (response.status === 200 && response.data) {
                // إرسال الصورة بعد إزالة الخلفية
                const caption = `╭━━━≪•🖼️ *إزالة الخلفية* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃✅ *تم إزالة الخلفية بنجاح!*
┃━━━━━━━━━━━━━━━━━━━━━
┃✨ *تمت المعالجة بواسطة:* JAWAD.BOT
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
                
                await sock.sendMessage(chatId, {
                    image: response.data,
                    caption: caption
                }, { quoted: message });
                
                // إظهار تفاعل النجاح
                await sock.sendMessage(chatId, {
                    react: { text: '✅', key: message.key }
                });
            } else {
                throw new Error('فشل معالجة الصورة');
            }

        } catch (error) {
            console.error('خطأ في إزالة الخلفية:', error.message);
            
            let errorMessage = '❌ *فشل إزالة الخلفية!*\n';
            
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
            } else if (error.message.includes('No image')) {
                errorMessage += '🖼️ *لا توجد صورة!*\n⚠️ تأكد من توفير رابط صورة صالح.';
            } else {
                errorMessage += '⚠️ يرجى المحاولة لاحقاً. تأكد من أن الصورة واضحة ومنسقة بشكل جيد.';
            }
            
            await sock.sendMessage(chatId, { 
                text: errorMessage 
            }, { quoted: message });
        }
    }
};

// دالة التحقق من صحة الرابط
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}