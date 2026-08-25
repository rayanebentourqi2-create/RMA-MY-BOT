const axios = require('axios');

let triviaGames = {};

// دالة ترميز HTML entities
function decodeHtmlEntities(text) {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&eacute;/g, 'é')
        .replace(/&agrave;/g, 'à')
        .replace(/&egrave;/g, 'è')
        .replace(/&ccedil;/g, 'ç');
}

async function startTrivia(sock, chatId) {
    if (triviaGames[chatId]) {
        await sock.sendMessage(chatId, { 
            text: '⚠️ *لعبة الأسئلة مستمرة!*\n📌 هناك سؤال نشط حالياً، قم بالإجابة عليه أولاً.'
        });
        return;
    }

    try {
        // إظهار تفاعل "جاري التحميل"
        await sock.sendMessage(chatId, {
            react: { text: '📚', key: {} }
        });

        const response = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple');
        const questionData = response.data.results[0];

        // ترميز النص
        const question = decodeHtmlEntities(questionData.question);
        const correctAnswer = decodeHtmlEntities(questionData.correct_answer);
        const incorrectAnswers = questionData.incorrect_answers.map(a => decodeHtmlEntities(a));
        
        // خلط الخيارات
        const options = [...incorrectAnswers, correctAnswer].sort(() => Math.random() - 0.5);
        
        // تحديد صعوبة السؤال
        let difficultyEmoji = '⭐';
        const difficulty = questionData.difficulty;
        if (difficulty === 'easy') difficultyEmoji = '🟢';
        else if (difficulty === 'medium') difficultyEmoji = '🟡';
        else if (difficulty === 'hard') difficultyEmoji = '🔴';

        triviaGames[chatId] = {
            question: question,
            correctAnswer: correctAnswer,
            options: options,
            difficulty: difficulty,
            category: decodeHtmlEntities(questionData.category)
        };

        const optionsText = options.map((opt, i) => `┃ ${i + 1}. ${opt}`).join('\n');
        
        const message = `╭━━━≪•📚 *الـسـؤال الـثـقـافـي* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃📖 *الفئة:* ${triviaGames[chatId].category}
┃${difficultyEmoji} *الصعوبة:* ${difficulty === 'easy' ? 'سهل' : difficulty === 'medium' ? 'متوسط' : 'صعب'}
┃━━━━━━━━━━━━━━━━━━━━━
┃❓ *السؤال:*
┃━━━━━━━━━━━━━━━━━━━━━
┃📝 ${question}
┃━━━━━━━━━━━━━━━━━━━━━
┃🔘 *الخيارات:*
${optionsText}
┃━━━━━━━━━━━━━━━━━━━━━
┃💡 *للإجابة:* اكتب رقم الإجابة
┃📌 مثال: .اجابة 2
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        await sock.sendMessage(chatId, { text: message });
        
    } catch (error) {
        console.error('خطأ في جلب سؤال المعلومة:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ *حدث خطأ!*\n⚠️ تعذر جلب سؤال ثقافي. يرجى المحاولة لاحقاً.'
        });
    }
}

async function answerTrivia(sock, chatId, answer, message) {
    if (!triviaGames[chatId]) {
        await sock.sendMessage(chatId, { 
            text: '📚 *لا توجد لعبة نشطة!*\n\n🎮 لبدء لعبة جديدة، اكتب:\n`.سؤال ثقافي`'
        }, { quoted: message });
        return;
    }

    const game = triviaGames[chatId];
    let userAnswer = answer.trim();
    let isCorrect = false;
    
    // التحقق إذا كانت الإجابة برقم (1,2,3,4)
    const optionNumber = parseInt(userAnswer);
    if (!isNaN(optionNumber) && optionNumber >= 1 && optionNumber <= game.options.length) {
        userAnswer = game.options[optionNumber - 1];
    }
    
    // مقارنة الإجابة
    if (userAnswer.toLowerCase() === game.correctAnswer.toLowerCase()) {
        isCorrect = true;
    }
    
    // إظهار تفاعل حسب الإجابة
    await sock.sendMessage(chatId, {
        react: { text: isCorrect ? '✅' : '❌', key: message.key }
    });
    
    let resultMessage;
    if (isCorrect) {
        resultMessage = `╭━━━≪•✅ *إجـابـة صـحـيـحـة* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃🎉 *أحسنت! الإجابة صحيحة*
┃━━━━━━━━━━━━━━━━━━━━━
┃📝 *الإجابة الصحيحة:* ${game.correctAnswer}
┃━━━━━━━━━━━━━━━━━━━━━
┃🏆 *نقاط:* +1
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
    } else {
        resultMessage = `╭━━━≪•❌ *إجـابـة خـاطـئـة* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃😔 *للأسف! الإجابة خاطئة*
┃━━━━━━━━━━━━━━━━━━━━━
┃📝 *الإجابة الصحيحة:* ${game.correctAnswer}
┃━━━━━━━━━━━━━━━━━━━━━
┃💪 *لا تيأس! جرب السؤال التالي*
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
    }
    
    await sock.sendMessage(chatId, { text: resultMessage }, { quoted: message });
    
    // حذف اللعبة بعد الانتهاء
    delete triviaGames[chatId];
}

module.exports = { startTrivia, answerTrivia };