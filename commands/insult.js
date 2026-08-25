const insults = [
    "😒 أنت مثل السحابة.. عندما تختفي، يصبح اليوم جميلاً!",
    "😂 أنت تجلب السعادة للجميع عندما تغادر الغرفة!",
    "🤔 كنت سأتفق معك، ولكن عندها سنكون كلانا مخطئين.",
    "😏 أنت لست غبياً، فقط حظك سيء في التفكير.",
    "🤫 أسرارك دائماً آمنة معي. أنا لا أستمع إليها أصلاً.",
    "🧬 أنت دليل على أن التطور يأخذ استراحة أحياناً.",
    "🪞 لديك شيء على ذقنك... لا، الثالث من الأسفل.",
    "💻 أنت مثل تحديث البرامج. كلما أراك أفكر: 'هل أحتاج هذا حقاً الآن؟'",
    "🎉 أنت تجلب السعادة للجميع... كما تعلم، عندما تغادر.",
    "🪙 أنت مثل الفلس الواحد: وجهين ولا تساوي الكثير.",
    "🧠 لديك شيء في عقلك... أوه، انتظر، لا شيء.",
    "🧴 أنت سبب كتابة التعليمات على عبوات الشامبو.",
    "☁️ أنت مثل السحابة.. دائماً تطفو بلا هدف حقيقي.",
    "🥛 نكاتك مثل الحليب منتهي الصلاحية: حامضة ويصعب هضمها.",
    "🕯️ أنت مثل شمعة في مهب الريح... عديم الفائدة عندما تشتد الأمور.",
    "😤 لديك شيء فريد - قدرتك على إزعاج الجميع بالتساوي.",
    "📶 أنت مثل إشارة الواي فاي - دائماً ضعيفة عندما تكون في أمس الحاجة إليها.",
    "🎭 أنت دليل على أنه ليس كل شخص يحتاج إلى فلتر ليكون غير جذاب.",
    "🌀 طاقتك مثل الثقب الأسود - تمتص الحياة من الغرفة.",
    "📻 لديك الوجه المثالي للإذاعة.",
    "🚗 أنت مثل زحمة المرور - لا أحد يريدك، لكنك هنا.",
    "✏️ أنت مثل قلم مكسور - لا فائدة منك.",
    "💡 أفكارك أصلية جداً، أنا متأكد أنني سمعتها جميعاً من قبل.",
    "📚 أنت دليل حي على أن الأخطاء يمكن أن تكون منتجة.",
    "🛋️ أنت لست كسولاً، أنت فقط شديد التحفيز لفعل لا شيء.",
    "💻 عقلك يعمل بنظام Windows 95 - بطيء وقديم.",
    "🛑 أنت مثل مطب السرعة - لا أحد يحبك، ولكن الجميع يتعامل معك.",
    "🦟 أنت مثل سحابة من البعوض - مزعج فقط.",
    "🗣️ أنت تجمع الناس معاً... ليتحدثوا عن مدى إزعاجك."
];

async function insultCommand(sock, chatId, message) {
    try {
        if (!message || !chatId) {
            console.log('رسالة أو معرف محادثة غير صالح:', { message, chatId });
            return;
        }

        let userToInsult;
        
        // التحقق من وجود مستخدم مشار إليه
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            userToInsult = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        // التحقق من وجود رد على رسالة
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToInsult = message.message.extendedTextMessage.contextInfo.participant;
        }
        
        if (!userToInsult) {
            await sock.sendMessage(chatId, { 
                text: '😈 *أمر الإهانة - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.اهانة @مستخدم` أو قم بالرد على رسالة الشخص\n\n📝 *مثال:*\n`.اهانة @DarkXecutor`\n\n⚠️ *ملاحظة:* هذا أمر ترفيهي للضحك فقط!'
            }, { quoted: message });
            return;
        }

        // إظهار تفاعل "جاري الإهانة"
        await sock.sendMessage(chatId, {
            react: { text: '😈', key: message.key }
        });

        const insult = insults[Math.floor(Math.random() * insults.length)];
        const userName = userToInsult.split('@')[0];

        // تأخير لتجنب التقييد
        await new Promise(resolve => setTimeout(resolve, 1000));

        const responseText = `╭━━━≪•😈 *إهـانـة* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃👤 @${userName}، 
┃━━━━━━━━━━━━━━━━━━━━━
┃💢 ${insult}
┃━━━━━━━━━━━━━━━━━━━━━
┃⚠️ *هذا مجرد ترفيه، لا تأخذه بجدية!*
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        await sock.sendMessage(chatId, { 
            text: responseText,
            mentions: [userToInsult]
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر الإهانة:', error);
        if (error.data === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
                await sock.sendMessage(chatId, { 
                    text: '⏳ *تم الوصول للحد الأقصى!*\n⚠️ يرجى الانتظار بضع ثوانٍ ثم المحاولة مرة أخرى.'
                }, { quoted: message });
            } catch (retryError) {
                console.error('خطأ في إرسال رسالة إعادة المحاولة:', retryError);
            }
        } else {
            try {
                await sock.sendMessage(chatId, { 
                    text: '❌ *حدث خطأ!*\n⚠️ تعذر إرسال الإهانة. يرجى المحاولة لاحقاً.'
                }, { quoted: message });
            } catch (sendError) {
                console.error('خطأ في إرسال رسالة الخطأ:', sendError);
            }
        }
    }
}

module.exports = { insultCommand };