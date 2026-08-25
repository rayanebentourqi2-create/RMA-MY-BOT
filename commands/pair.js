const axios = require('axios');
const { sleep } = require('../lib/myfunc');

async function pairCommand(sock, chatId, message, q) {
    try {
        if (!q) {
            return await sock.sendMessage(chatId, {
                text: "🔐 *أمر الحصول على رمز الاقتران - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.اقتران <رقم الهاتف>`\n\n📝 *مثال:*\n`.اقتران 966512345678`\n\n✨ *سيتم إرسال رمز الاقتران لتسجيل الدخول إلى واتساب*\n\n⚠️ *ملاحظة:* تأكد من كتابة الرقم بصيغة دولية صحيحة (بدون + أو مسافات)",
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363427092431731@newsletter',
                        newsletterName: 'JAWAD.BOT',
                        serverMessageId: -1
                    }
                }
            });
        }

        const numbers = q.split(',')
            .map((v) => v.replace(/[^0-9]/g, ''))
            .filter((v) => v.length > 5 && v.length < 20);

        if (numbers.length === 0) {
            return await sock.sendMessage(chatId, {
                text: "❌ *رقم غير صالح!*\n📌 يرجى استخدام الصيغة الصحيحة: .اقتران <رقم الهاتف>\n📝 مثال: .اقتران 966512345678",
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363427092431731@newsletter',
                        newsletterName: 'JAWAD.BOT',
                        serverMessageId: -1
                    }
                }
            });
        }

        for (const number of numbers) {
            const whatsappID = number + '@s.whatsapp.net';
            
            // إظهار تفاعل "جاري التحقق"
            await sock.sendMessage(chatId, {
                react: { text: '🔐', key: message.key }
            });

            const result = await sock.onWhatsApp(whatsappID);

            if (!result[0]?.exists) {
                return await sock.sendMessage(chatId, {
                    text: `❌ *رقم غير مسجل في واتساب!*\n📱 الرقم: ${number}\n⚠️ تأكد من أن الرقم صحيح ومسجل في واتساب.`,
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363427092431731@newsletter',
                            newsletterName: 'JAWAD.BOT',
                            serverMessageId: -1
                        }
                    }
                });
            }

            await sock.sendMessage(chatId, {
                text: `⏳ *جاري طلب رمز الاقتران للرقم:* ${number}\n📱 يرجى الانتظار...`,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363427092431731@newsletter',
                        newsletterName: 'JAWAD.BOT',
                        serverMessageId: -1
                    }
                }
            });

            try {
                const response = await axios.get(`https://knight-bot-paircode.onrender.com/code?number=${number}`, {
                    timeout: 30000
                });
                
                if (response.data && response.data.code) {
                    const code = response.data.code;
                    if (code === "Service Unavailable") {
                        throw new Error('Service Unavailable');
                    }
                    
                    await sleep(3000);
                    
                    const messageText = `╭━━━≪•🔐 *رَمـز الاقـتـران* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃📱 *الرقم:* ${number}
┃🔑 *الرمز:* ${code}
┃━━━━━━━━━━━━━━━━━━━━━
┃📌 *كيفية الاستخدام:*
┃1️⃣ افتح واتساب
┃2️⃣ اذهب إلى الإعدادات > الأجهزة المرتبطة
┃3️⃣ اضغط على "ربط جهاز"
┃4️⃣ أدخل الرمز الموضح أعلاه
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
                    
                    await sock.sendMessage(chatId, {
                        text: messageText,
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363427092431731@newsletter',
                                newsletterName: 'JAWAD.BOT',
                                serverMessageId: -1
                            }
                        }
                    });
                    
                    await sock.sendMessage(chatId, {
                        react: { text: '✅', key: message.key }
                    });
                } else {
                    throw new Error('Invalid response from server');
                }
            } catch (apiError) {
                console.error('خطأ في API:', apiError);
                const errorMessage = apiError.message === 'Service Unavailable' 
                    ? "⚠️ *الخدمة غير متاحة حالياً!*\n📌 يرجى المحاولة مرة أخرى لاحقاً."
                    : "❌ *فشل إنشاء رمز الاقتران!*\n📌 يرجى المحاولة مرة أخرى لاحقاً.";
                
                await sock.sendMessage(chatId, {
                    text: errorMessage,
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363427092431731@newsletter',
                            newsletterName: 'JAWAD.BOT',
                            serverMessageId: -1
                        }
                    }
                });
            }
        }
    } catch (error) {
        console.error(error);
        await sock.sendMessage(chatId, {
            text: "❌ *حدث خطأ غير متوقع!*\n⚠️ يرجى المحاولة مرة أخرى لاحقاً.",
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363427092431731@newsletter',
                    newsletterName: 'JAWAD.BOT',
                    serverMessageId: -1
                }
            }
        });
    }
}

module.exports = pairCommand;