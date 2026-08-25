const { handleAntiBadwordCommand } = require('../lib/antibadword');
const isAdminHelper = require('../lib/isAdmin');

async function antibadwordCommand(sock, chatId, message, senderId, isSenderAdmin) {
    try {
        // التحقق من صلاحيات المشرف
        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { 
                text: '⛔ *للأسف!*\nهذا الأمر متاح فقط لمشرفي المجموعة.',
                contextInfo: {
                    forwardingScore: 0,
                    isForwarded: false
                }
            }, { quoted: message });
            return;
        }

        // استخراج النص من الأمر
        const text = message.message?.conversation || 
                    message.message?.extendedTextMessage?.text || '';
        const match = text.split(' ').slice(1).join(' ');

        // إظهار تفاعل "جاري المعالجة"
        await sock.sendMessage(chatId, {
            react: { text: '🛡️', key: message.key }
        });

        await handleAntiBadwordCommand(sock, chatId, message, match);
        
    } catch (error) {
        console.error('خطأ في أمر منع الكلمات السيئة:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ *حدث خطأ!*\nيرجى المحاولة مرة أخرى لاحقاً.',
            contextInfo: {
                forwardingScore: 0,
                isForwarded: false
            }
        }, { quoted: message });
    }
}

module.exports = antibadwordCommand;