const eightBallResponses = [
    "🔮 نعم، بالتأكيد!",
    "🎱 مستحيل!",
    "⚡ اسأل لاحقاً.",
    "✨ من المؤكد.",
    "❌ مشكوك فيه جداً.",
    "✅ بلا شك.",
    "🔮 ردي هو لا.",
    "🎱 تشير العلامات إلى نعم.",
    "⚡ الأجواء تقول نعم!",
    "✨ ليس الآن، حاول مرة أخرى.",
    "❌ الأفضل ألا تعرف.",
    "✅ يبدو الأمر جيداً!",
    "🔮 لا تعتمد على ذلك.",
    "🎱 أرى مستقبلاً مشرقاً لذلك.",
    "⚡ لا تتوقع ذلك.",
    "✨ احلامك ستتحقق!",
    "❌ فرصتك ضئيلة جداً.",
    "✅ الكون يقول نعم!",
    "🔮 بالتأكيد - الأفضل لك.",
    "🎱 الجواب في يد القدر..."
];

async function eightBallCommand(sock, chatId, question, message) {
    if (!question) {
        await sock.sendMessage(chatId, { 
            text: '🔮 *الكرة السحرية - JAWAD.BOT*\n\n📌 *الاستخدام:*\n`.8ball <سؤالك>`\n\n📝 *مثال:*\n`.8ball هل سأنجح في امتحاني؟`\n`.8ball هل سأحصل على الوظيفة؟`\n\n✨ *اسأل أي سؤال وستحصل على إجابة من الكرة السحرية*'
        }, { quoted: message });
        return;
    }

    // إظهار تفاعل "جاري التفكير"
    await sock.sendMessage(chatId, {
        react: { text: '🔮', key: message.key }
    });

    // تأخير بسيط لمحاكاة التفكير
    await new Promise(resolve => setTimeout(resolve, 1000));

    const randomResponse = eightBallResponses[Math.floor(Math.random() * eightBallResponses.length)];
    
    const responseText = `╭━━━≪•🔮 *الـكـرة الـسـحـريـة* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃❓ *سؤالك:* ${question}
┃━━━━━━━━━━━━━━━━━━━━━
┃✨ *الإجابة:* 
┃${randomResponse}
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

    await sock.sendMessage(chatId, { 
        text: responseText
    }, { quoted: message });

    // إظهار تفاعل النجاح
    await sock.sendMessage(chatId, {
        react: { text: '✅', key: message.key }
    });
}

module.exports = { eightBallCommand };