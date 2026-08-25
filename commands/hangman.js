const fs = require('fs');

// قائمة الكلمات للعبة (بالعربية والإنجليزية)
const words = [
    // كلمات عربية
    'بوت', 'واتساب', 'جافا', 'برمجة', 'حاسوب', 'انترنت', 'ذكاء', 'تكنولوجيا',
    'مطور', 'موقع', 'تطبيق', 'بيانات', 'شبكة', 'خادم', 'قاعدة', 'معلومات',
    'هاتف', 'شاشة', 'لوحة', 'مفاتيح', 'فأرة', 'طابعة', 'ماسح', 'سماعة',
    'كاميرا', 'معالج', 'ذاكرة', 'قرص', 'مجلد', 'ملف', 'متصفح', 'بريد',
    
    // كلمات إنجليزية
    'javascript', 'bot', 'hangman', 'whatsapp', 'nodejs', 'python', 'coding',
    'developer', 'internet', 'computer', 'programming', 'software', 'hardware',
    'network', 'server', 'database', 'application', 'website', 'browser'
];

let hangmanGames = {};

// رسم الرجل المشنوق حسب عدد الأخطاء
function drawHangman(wrongGuesses) {
    const stages = [
        `┌───┐
│   │
│   
│   
│   
│   
└─────`,
        `┌───┐
│   │
│   😐
│   
│   
│   
└─────`,
        `┌───┐
│   │
│   😐
│   │
│   
│   
└─────`,
        `┌───┐
│   │
│   😐
│  /│
│   
│   
└─────`,
        `┌───┐
│   │
│   😐
│  /│\\
│   
│   
└─────`,
        `┌───┐
│   │
│   😐
│  /│\\
│  /
│   
└─────`,
        `┌───┐
│   │
│   😐
│  /│\\
│  / \\
│   
└─────`
    ];
    return stages[Math.min(wrongGuesses, stages.length - 1)];
}

function startHangman(sock, chatId, message) {
    // التحقق من وجود لعبة نشطة
    if (hangmanGames[chatId]) {
        sock.sendMessage(chatId, { 
            text: '⚠️ *يوجد لعبة نشطة حالياً!*\n📌 قم بتخمين حرف أو ابدأ لعبة جديدة بعد انتهاء هذه.',
            quoted: message
        });
        return;
    }

    const word = words[Math.floor(Math.random() * words.length)];
    const maskedWord = '_'.repeat(word.length).split('');

    hangmanGames[chatId] = {
        word: word,
        maskedWord: maskedWord,
        guessedLetters: [],
        wrongGuesses: 0,
        maxWrongGuesses: 6,
    };

    const initialDisplay = maskedWord.join(' ');
    const hangmanArt = drawHangman(0);
    
    sock.sendMessage(chatId, { 
        text: `🎮 *لعبة الرجل المشنوق - HANGMAN*\n\n${hangmanArt}\n\n📝 *الكلمة:* ${initialDisplay}\n🔤 *عدد الحروف:* ${word.length}\n\n💡 *اكتب:* .خمن <حرف>\n📌 مثال: .خمن أ`
    }, { quoted: message });
}

function guessLetter(sock, chatId, letter, message) {
    if (!hangmanGames[chatId]) {
        sock.sendMessage(chatId, { 
            text: '❌ *لا توجد لعبة نشطة!*\n🎮 ابدأ لعبة جديدة بـ .رجل مشنوق',
            quoted: message
        });
        return;
    }

    const game = hangmanGames[chatId];
    const { word, maskedWord, guessedLetters, maxWrongGuesses } = game;
    let { wrongGuesses } = game;

    // التأكد من إدخال حرف واحد
    if (!letter || letter.length !== 1) {
        sock.sendMessage(chatId, { 
            text: '❌ *خطأ!*\n📌 يرجى إدخال حرف واحد فقط.\n📝 مثال: .خمن أ'
        }, { quoted: message });
        return;
    }

    // تحويل الحرف إلى صيغة موحدة
    const guessedLetter = letter.toLowerCase();
    const originalWord = word;
    const wordLower = word.toLowerCase();

    if (guessedLetters.includes(guessedLetter)) {
        sock.sendMessage(chatId, { 
            text: `⚠️ *لقد خمنت "${letter}" مسبقاً!*\n📝 حاول بحرف آخر.`
        }, { quoted: message });
        return;
    }

    guessedLetters.push(guessedLetter);

    if (wordLower.includes(guessedLetter)) {
        // تحديث الكلمة المقنعة
        for (let i = 0; i < originalWord.length; i++) {
            if (originalWord[i].toLowerCase() === guessedLetter) {
                maskedWord[i] = originalWord[i];
            }
        }
        
        const currentDisplay = maskedWord.join(' ');
        const hangmanArt = drawHangman(wrongGuesses);
        
        sock.sendMessage(chatId, { 
            text: `✅ *إجابة صحيحة!*\n\n${hangmanArt}\n\n📝 *الكلمة:* ${currentDisplay}\n🔤 *الحروف المخمنة:* ${guessedLetters.join(', ')}`
        }, { quoted: message });

        // التحقق من الفوز
        if (!maskedWord.includes('_')) {
            sock.sendMessage(chatId, { 
                text: `🎉 *مبروك! لقد فزت!* 🎉\n\n📝 *الكلمة كانت:* ${originalWord}\n🎯 *عدد الأخطاء:* ${wrongGuesses}/${maxWrongGuesses}\n\n✨ *أحسنت! ابدأ لعبة جديدة بـ .رجل مشنوق*`
            }, { quoted: message });
            delete hangmanGames[chatId];
        }
    } else {
        game.wrongGuesses += 1;
        wrongGuesses = game.wrongGuesses;
        const remainingTries = maxWrongGuesses - wrongGuesses;
        const hangmanArt = drawHangman(wrongGuesses);
        
        sock.sendMessage(chatId, { 
            text: `❌ *إجابة خاطئة!*\n\n${hangmanArt}\n\n📝 *الكلمة:* ${maskedWord.join(' ')}\n⚠️ *تبقى ${remainingTries} محاولة/محاولات*\n🔤 *الحروف المخمنة:* ${guessedLetters.join(', ')}`
        }, { quoted: message });

        // التحقق من الخسارة
        if (game.wrongGuesses >= maxWrongGuesses) {
            sock.sendMessage(chatId, { 
                text: `💀 *لقد خسرت!* 💀\n\n📝 *الكلمة كانت:* ${originalWord}\n🎯 *عدد الأخطاء:* ${wrongGuesses}/${maxWrongGuesses}\n\n💪 *لا تيأس! ابدأ لعبة جديدة بـ .رجل مشنوق*`
            }, { quoted: message });
            delete hangmanGames[chatId];
        }
    }
}

module.exports = { startHangman, guessLetter };