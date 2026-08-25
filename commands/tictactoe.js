const TicTacToe = require('../lib/tictactoe');

// تخزين الألعاب عالمياً
const games = {};

// دالة ترجمة حالة اللعبة
function getGameStatusText(winner, isTie, currentTurn, playerX, playerO) {
    if (winner) {
        const winnerName = winner.split('@')[0];
        return `🎉 *الفائز:* @${winnerName} يربح اللعبة!`;
    } else if (isTie) {
        return `🤝 *تعادل!* انتهت اللعبة بالتعادل.`;
    } else {
        const turnName = currentTurn.split('@')[0];
        const turnSymbol = currentTurn === playerX ? '❎' : '⭕';
        return `🎲 *دور:* @${turnName} (${turnSymbol})`;
    }
}

async function tictactoeCommand(sock, chatId, senderId, text) {
    try {
        // التحقق إذا كان اللاعب في لعبة بالفعل
        if (Object.values(games).find(room => 
            room.id.startsWith('tictactoe') && 
            [room.game.playerX, room.game.playerO].includes(senderId)
        )) {
            await sock.sendMessage(chatId, { 
                text: '❌ *أنت لا تزال في لعبة!*\n📌 اكتب *استسلام* للخروج من اللعبة الحالية.' 
            }, { quoted: text?.message });
            return;
        }

        // البحث عن غرفة موجودة
        let room = Object.values(games).find(room => 
            room.state === 'WAITING' && 
            (text ? room.name === text : true)
        );

        if (room) {
            // الانضمام إلى غرفة موجودة
            room.o = chatId;
            room.game.playerO = senderId;
            room.state = 'PLAYING';

            const arr = room.game.render().map(v => ({
                'X': '❎',
                'O': '⭕',
                '1': '1️⃣',
                '2': '2️⃣',
                '3': '3️⃣',
                '4': '4️⃣',
                '5': '5️⃣',
                '6': '6️⃣',
                '7': '7️⃣',
                '8': '8️⃣',
                '9': '9️⃣',
            }[v]));

            const str = `╭━━━≪•🎮 *لـعـبـة إكـس-أو* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃✨ *بدأت اللعبة!*
┃━━━━━━━━━━━━━━━━━━━━━
┃🎲 *دور:* @${room.game.currentTurn.split('@')[0]} (${room.game.currentTurn === room.game.playerX ? '❎' : '⭕'})
┃━━━━━━━━━━━━━━━━━━━━━
┃
┃   ${arr.slice(0, 3).join('')}
┃   ${arr.slice(3, 6).join('')}
┃   ${arr.slice(6).join('')}
┃
┃━━━━━━━━━━━━━━━━━━━━━
┃📌 *القوانين:*
┃• 3 رموز متتالية أفقياً، عمودياً أو قطرياً
┃• اكتب رقم (1-9) لوضع رمزك
┃• اكتب *استسلام* للتخلي عن اللعبة
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

            await sock.sendMessage(chatId, { 
                text: str,
                mentions: [room.game.currentTurn, room.game.playerX, room.game.playerO]
            });

        } else {
            // إنشاء غرفة جديدة
            room = {
                id: 'tictactoe-' + (+new Date),
                x: chatId,
                o: '',
                game: new TicTacToe(senderId, 'o'),
                state: 'WAITING'
            };

            if (text) room.name = text;

            await sock.sendMessage(chatId, { 
                text: `⏳ *انتظار الخصم...*\n🎮 اكتب *.ttt ${text || ''}* للانضمام إلى اللعبة!\n\n🔹 *أنت تلعب بـ:* ${room.game.playerX === senderId ? '❎ (X)' : '⭕ (O)'}`
            });

            games[room.id] = room;
        }

    } catch (error) {
        console.error('خطأ في أمر لعبة إكس-أو:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ *حدث خطأ!*\n⚠️ تعذر بدء اللعبة. يرجى المحاولة لاحقاً.' 
        });
    }
}

async function handleTicTacToeMove(sock, chatId, senderId, text) {
    try {
        // البحث عن لعبة اللاعب
        const room = Object.values(games).find(room => 
            room.id.startsWith('tictactoe') && 
            [room.game.playerX, room.game.playerO].includes(senderId) && 
            room.state === 'PLAYING'
        );

        if (!room) return;

        const isSurrender = /^(استسلام|surrender|give up)$/i.test(text);
        
        if (!isSurrender && !/^[1-9]$/.test(text)) return;

        // السماح بالاستسلام في أي وقت
        if (senderId !== room.game.currentTurn && !isSurrender) {
            await sock.sendMessage(chatId, { 
                text: '❌ *ليس دورك الآن!*\n⏳ انتظر دورك للعب.' 
            });
            return;
        }

        let ok = isSurrender ? true : room.game.turn(
            senderId === room.game.playerO,
            parseInt(text) - 1
        );

        if (!ok && !isSurrender) {
            await sock.sendMessage(chatId, { 
                text: '❌ *حركة غير صالحة!*\n⚠️ هذه الخانة مشغولة بالفعل. اختر رقماً آخر (1-9).' 
            });
            return;
        }

        let winner = room.game.winner;
        let isTie = room.game.turns === 9;

        const arr = room.game.render().map(v => ({
            'X': '❎',
            'O': '⭕',
            '1': '1️⃣',
            '2': '2️⃣',
            '3': '3️⃣',
            '4': '4️⃣',
            '5': '5️⃣',
            '6': '6️⃣',
            '7': '7️⃣',
            '8': '8️⃣',
            '9': '9️⃣',
        }[v]));

        if (isSurrender) {
            // تحديد الفائز كخصم المستسلم
            winner = senderId === room.game.playerX ? room.game.playerO : room.game.playerX;
            
            await sock.sendMessage(chatId, { 
                text: `╭━━━≪•🏳️ *اسـتـسـلام* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃😔 @${senderId.split('@')[0]} استسلم!
┃🎉 @${winner.split('@')[0]} يفوز باللعبة!
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`,
                mentions: [senderId, winner]
            });
            
            delete games[room.id];
            return;
        }

        const gameStatus = getGameStatusText(winner, isTie, room.game.currentTurn, room.game.playerX, room.game.playerO);

        const str = `╭━━━≪•🎮 *لـعـبـة إكـس-أو* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃${gameStatus}
┃━━━━━━━━━━━━━━━━━━━━━
┃
┃   ${arr.slice(0, 3).join('')}
┃   ${arr.slice(3, 6).join('')}
┃   ${arr.slice(6).join('')}
┃
┃━━━━━━━━━━━━━━━━━━━━━
┃❎ *اللاعب X:* @${room.game.playerX.split('@')[0]}
┃⭕ *اللاعب O:* @${room.game.playerO.split('@')[0]}
┃━━━━━━━━━━━━━━━━━━━━━
${!winner && !isTie ? '┃💡 اكتب رقم (1-9) لوضع رمزك\n┃🏳️ اكتب *استسلام* للتخلي' : ''}
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;

        const mentions = [
            room.game.playerX, 
            room.game.playerO,
            ...(winner ? [winner] : [room.game.currentTurn])
        ];

        // إرسال التحديث لكلا اللاعبين
        await sock.sendMessage(room.x, { 
            text: str,
            mentions: mentions
        });

        if (room.x !== room.o) {
            await sock.sendMessage(room.o, { 
                text: str,
                mentions: mentions
            });
        }

        if (winner || isTie) {
            delete games[room.id];
        }

    } catch (error) {
        console.error('خطأ في حركة لعبة إكس-أو:', error);
    }
}

module.exports = {
    tictactoeCommand,
    handleTicTacToeMove
};