const axios = require('axios');
const fetch = require('node-fetch');

async function aiCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        
        if (!text) {
            return await sock.sendMessage(chatId, { 
                text: "🤖 *بوت الذكاء الاصطناعي - JAWAD.BOT*\n\nمثال الاستخدام:\n`.gpt اكتب لي فقرة عن التكنولوجيا`\n`.gemini ما هي عاصمة المغرب؟`\n\n📌 الأوامر المتاحة:\n• .gpt <سؤالك>\n• .gemini <سؤالك>"
            }, {
                quoted: message
            });
        }

        // الحصول على الأمر والسؤال
        const parts = text.split(' ');
        const command = parts[0].toLowerCase();
        const query = parts.slice(1).join(' ').trim();

        if (!query) {
            return await sock.sendMessage(chatId, { 
                text: "❌ يرجى كتابة سؤالك بعد الأمر.\nمثال: `.gpt ما هو الذكاء الاصطناعي؟`"
            }, {quoted: message});
        }

        try {
            // إظهار تفاعل أن البوت يفكر
            await sock.sendMessage(chatId, {
                react: { text: '🤖', key: message.key }
            });

            // إرسال رسالة "جاري التفكير"
            const thinkingMsg = await sock.sendMessage(chatId, {
                text: "🧠 *جاري التفكير...*\n⏳ يرجى الانتظار قليلاً"
            }, { quoted: message });

            if (command === '.gpt') {
                // استدعاء واجهة GPT
                const apis = [
                    `https://zellapi.autos/ai/chatbot?text=${encodeURIComponent(query)}`,
                    `https://api.siputzx.my.id/api/ai/gpt4?text=${encodeURIComponent(query)}`,
                    `https://api.ryzendesu.vip/api/ai/chatgpt?text=${encodeURIComponent(query)}`
                ];

                let answer = null;
                for (const api of apis) {
                    try {
                        const response = await axios.get(api);
                        if (response.data && (response.data.result || response.data.message || response.data.data)) {
                            answer = response.data.result || response.data.message || response.data.data;
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }

                if (answer) {
                    // حذف رسالة "جاري التفكير"
                    await sock.sendMessage(chatId, { delete: thinkingMsg.key });
                    
                    await sock.sendMessage(chatId, {
                        text: `🤖 *GPT - JAWAD.BOT*\n\n${answer}\n\n━━━━━━━━━━━━━━━━━━\n📌 *ملاحظة:* قد تختلف الدقة حسب واجهة API`
                    }, { quoted: message });
                } else {
                    throw new Error('فشل في الحصول على رد من GPT');
                }
                
            } else if (command === '.gemini') {
                const apis = [
                    `https://vapis.my.id/api/gemini?q=${encodeURIComponent(query)}`,
                    `https://api.siputzx.my.id/api/ai/gemini-pro?content=${encodeURIComponent(query)}`,
                    `https://api.ryzendesu.vip/api/ai/gemini?text=${encodeURIComponent(query)}`,
                    `https://zellapi.autos/ai/chatbot?text=${encodeURIComponent(query)}`,
                    `https://api.giftedtech.my.id/api/ai/geminiai?apikey=gifted&q=${encodeURIComponent(query)}`,
                    `https://api.giftedtech.my.id/api/ai/geminiaipro?apikey=gifted&q=${encodeURIComponent(query)}`
                ];

                let answer = null;
                for (const api of apis) {
                    try {
                        const response = await fetch(api);
                        const data = await response.json();

                        if (data.message || data.data || data.answer || data.result) {
                            answer = data.message || data.data || data.answer || data.result;
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }
                
                if (answer) {
                    // حذف رسالة "جاري التفكير"
                    await sock.sendMessage(chatId, { delete: thinkingMsg.key });
                    
                    await sock.sendMessage(chatId, {
                        text: `✨ *Gemini - JAWAD.BOT*\n\n${answer}\n\n━━━━━━━━━━━━━━━━━━\n📌 *ملاحظة:* قد تختلف الدقة حسب واجهة API`
                    }, { quoted: message });
                } else {
                    throw new Error('فشل في الحصول على رد من Gemini');
                }
            }
        } catch (error) {
            console.error('خطأ في API:', error);
            await sock.sendMessage(chatId, {
                text: "❌ *عذراً!* لم أتمكن من الحصول على رد.\n\n📌 *الأسباب المحتملة:*\n• مشكلة في الاتصال بالخادم\n• الخدمة مؤقتاً غير متاحة\n\n🔄 يرجى المحاولة مرة أخرى بعد قليل.",
                contextInfo: {
                    mentionedJid: [message.key.participant || message.key.remoteJid]
                }
            }, { quoted: message });
        }
    } catch (error) {
        console.error('خطأ في أمر الذكاء الاصطناعي:', error);
        await sock.sendMessage(chatId, {
            text: "❌ *حدث خطأ غير متوقع!*\n\n🔄 يرجى المحاولة مرة أخرى.",
            contextInfo: {
                mentionedJid: [message.key.participant || message.key.remoteJid]
            }
        }, { quoted: message });
    }
}

module.exports = aiCommand;