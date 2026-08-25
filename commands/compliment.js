const compliments = [
    "أنت رائع كما أنت!",
    "لديك حس دعابة رائع!",
    "أنت شخص مدروس ولطيف بشكل لا يصدق.",
    "أنت أقوى مما تظن!",
    "تنير الغرفة بوجودك!",
    "أنت صديق حقيقي.",
    "أنت تلهمني!",
    "إبداعك لا حدود له!",
    "لديك قلب من ذهب.",
    "تصنع فرقاً في العالم.",
    "إيجابيتك معدية!",
    "لديك أخلاقيات عمل لا تصدق.",
    "تظهر أفضل ما في الناس.",
    "ابتسامتك تضيء يوم الجميع.",
    "أنت موهوب جداً في كل ما تفعله.",
    "لطفك يجعل العالم مكاناً أفضل.",
    "لديك منظور فريد ورائع.",
    "حماسك ملهم حقاً!",
    "أنت قادر على تحقيق أشياء عظيمة.",
    "أنت تعرف دائماً كيف تجعل الشخص يشعر بالتميز.",
    "ثقتك بنفسك تستحق الإعجاب.",
    "لديك روح جميلة.",
    "كرمك لا حدود له.",
    "لديك عين رائعة على التفاصيل.",
    "شغفك محفز حقاً!",
    "أنت مستمع رائع.",
    "أنت أقوى مما تتصور!",
    "ضحكتك معدية.",
    "لديك موهبة طبيعية في جعل الآخرين يشعرون بالتقدير.",
    "تجعل العالم مكاناً أفضل بمجرد وجودك فيه.",
    "أنت شخص مميز وفريد!",
    "وجودك يضيف قيمة لكل من حولك.",
    "قلبك نقي وطيب.",
    "أنت تستحق كل الخير في هذه الحياة.",
    "طاقتك الإيجابية تغير الأجواء.",
    "أنت مثال رائع يحتذى به.",
    "تعاملك مع الآخرين يدل على أصلك الطيب.",
    "أنت شخص استثنائي بكل معنى الكلمة."
];

async function complimentCommand(sock, chatId, message) {
    try {
        if (!message || !chatId) {
            console.log('رسالة أو معرف محادثة غير صالح:', { message, chatId });
            return;
        }

        let userToCompliment;
        
        // التحقق من وجود مستخدم مشار إليه
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            userToCompliment = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        // التحقق من وجود رد على رسالة
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToCompliment = message.message.extendedTextMessage.contextInfo.participant;
        }
        
        if (!userToCompliment) {
            await sock.sendMessage(chatId, { 
                text: '💐 *أمر الإطراء - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.اطراء @مستخدم` أو قم بالرد على رسالة الشخص\n\n📝 *مثال:*\n`.اطراء @DarkXecutor`\n\n✨ *سيتم إرسال إطراء جميل للشخص المختار*'
            }, { quoted: message });
            return;
        }

        // إظهار تفاعل "جاري الإرسال"
        await sock.sendMessage(chatId, {
            react: { text: '💐', key: message.key }
        });

        const compliment = compliments[Math.floor(Math.random() * compliments.length)];
        const userName = userToCompliment.split('@')[0];

        // تأخير لتجنب التقييد
        await new Promise(resolve => setTimeout(resolve, 1000));

        const responseText = `╭━━━≪•💐 *إطـراء* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃✨ @${userName}، 
┃━━━━━━━━━━━━━━━━━━━━━
┃📝 ${compliment}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        await sock.sendMessage(chatId, { 
            text: responseText,
            mentions: [userToCompliment]
        }, { quoted: message });

        // إظهار تفاعل النجاح
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('خطأ في أمر الإطراء:', error);
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
                    text: '❌ *حدث خطأ!*\n⚠️ تعذر إرسال الإطراء. يرجى المحاولة لاحقاً.'
                }, { quoted: message });
            } catch (sendError) {
                console.error('خطأ في إرسال رسالة الخطأ:', sendError);
            }
        }
    }
}

module.exports = { complimentCommand };