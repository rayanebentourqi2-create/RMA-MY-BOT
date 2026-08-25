const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpCommand(sock, chatId, message) {
    const helpMessage = `
*╗══════════👨🏽‍💻═════════╔*
   *🤖 ${settings.botName || 'JAWAD.BOT'}*  
   Version: *${settings.version || '1.0.0'}*
   by ${settings.botOwner || 'DarkXecutor'}
   YT : ${global.ytch || 'jawad_bot'}
*╝══════════🔥═════════╚*

*الأوامر المتاحة:*

*╗══════════🍷═════════╔*
📜*الأوامر العامة*:
  *║ ➤ .help or .menu*
  *║ ➤ .ping*
  *║ ➤ .alive*
  *║ ➤ .tts <text>*
  *║ ➤ .owner*
  *║ ➤ .joke*
  *║ ➤ .quote*
  *║ ➤ .fact*
  *║ ➤ .weather <city>*
  *║ ➤ .news*
  *║ ➤ .attp <text>*
  *║ ➤ .lyrics* 
        *<song_title>*
  *║ ➤ .8ball <question>*
  *║ ➤ .groupinfo*
  *║ ➤ .staff or .admins*
  *║ ➤ .vv*
  *║ ➤ .trt <text> <lang>*
  *║ ➤ .ss <link>*
  *║ ➤ .jid*
  *║ ➤ .url*
*╝══════════🔥═════════╚*

*╗══════════🍷═════════╔*
💡*أوامر المشرفين*
  *║ ➤ .ban @user*
  *║ ➤ .promote @user*
  *║ ➤ .demote @user*
  *║ ➤ .mute <minutes>*
  *║ ➤ .unmute*
  *║ ➤ .delete or .del*
  *║ ➤ .kick @user*
  *║ ➤ .warnings @user*
  *║ ➤ .warn @user*
  *║ ➤ .antilink*
  *║ ➤ .antibadword*
  *║ ➤ .clear*
  *║ ➤ .tag <message>*
  *║ ➤ .tagall*
  *║ ➤ .tagnotadmin*
  *║ ➤ .hidetag <message>*
  *║ ➤ .chatbot*
  *║ ➤ .resetlink*
  *║ ➤ .antitag <on/off>*
  *║ ➤ .welcome <on/off>*
  *║ ➤ .goodbye <on/off>*
  *║ ➤ .setgdesc <description>*
  *║ ➤ .setgname <new name>*
  *║ ➤ .setgpp (reply to image)*
*╝══════════🔥═════════╚*

*╗══════════🍷═════════╔*
🔒*أوامر المطور*
  *║ ➤ .mode <public/private>*
  *║ ➤ .clearsession*
  *║ ➤ .antidelete*
  *║ ➤ .cleartmp*
  *║ ➤ .update*
  *║ ➤ .settings*
  *║ ➤ .setpp <reply to image>*
  *║ ➤ .autoreact <on/off>*
  *║ ➤ .autostatus <on/off>*
  *║ ➤ .autostatus react <on/off>*
  *║ ➤ .autotyping <on/off>*
  *║ ➤ .autoread <on/off>*
  *║ ➤ .anticall <on/off>*
  *║ ➤ .pmblocker <on/off/status>*
  *║ ➤ .pmblocker setmsg <text>*
  *║ ➤ .setmention <reply to msg>*
  *║ ➤ .mention <on/off>
*╝══════════🔥═════════╚*

*╗══════════🍷═════════╔*
🎨*أوامر الصور والملصقات*
  *║ ➤ .blur <image>*
  *║ ➤ .simage <reply to sticker>*
  *║ ➤ .sticker <reply to image>*
  *║ ➤ .removebg*
  *║ ➤ .remini*
  *║ ➤ .crop <reply to image>*
  *║ ➤ .tgsticker <Link>*
  *║ ➤ .meme*
  *║ ➤ .take <packname>*
  *║ ➤ .emojimix <emj1>+<emj2>*
  *║ ➤ .igs <insta link>*
  *║ ➤ .igsc <insta link>*
 *╝══════════🔥═════════╚* 

*╗══════════🍷═════════╔*
🔖*أوامر الصور*
  *║ ➤ .pies <country>*
  *║ ➤ .china*
  *║ ➤ .indonesia*
  *║ ➤ .japan*
  *║ ➤ .korea*
  *║ ➤ .hijab*
*╝══════════🔥═════════╚*

*╗══════════🍷═════════╔*
🎮*أوامر الألعاب*
  *║ ➤ .tictactoe @user*
  *║ ➤ .hangman*
  *║ ➤ .guess <letter>*
  *║ ➤ .trivia*
  *║ ➤ .answer <answer>*
  *║ ➤ .truth*
   ║ ➤ .dare
*╝══════════🔥═════════╚*

*╗══════════🍷═════════╔*
👾*أوامر الذكاء الاصطناعي*
  *║ ➤ .gpt <question>*
  *║ ➤ .gemini <question>*
  *║ ➤ .imagine <prompt>*
  *║ ➤ .flux <prompt>*
  *║ ➤ .sora <prompt>*
*╝══════════🔥═════════╚*

*╗══════════🍷═════════╔*
🎯*أوامر التسلية*
  *║ ➤ .compliment @user*
  *║ ➤ .insult @user*
  *║ ➤ .flirt*
  *║ ➤ .shayari*
  *║ ➤ .goodnight*
  *║ ➤ .roseday*
  *║ ➤ .character @user*
  *║ ➤ .wasted @user*
  *║ ➤ .ship @user*
  *║ ➤ .simp @user*
  *║ ➤ .stupid @user [text]*
*╝══════════🔥═════════╚*

*╗══════════🍷═════════╔*
🕸️*تأثيرات النصوص*
  *║ ➤ .metallic <text>*
  *║ ➤ .ice <text>*
  *║ ➤ .snow <text>*
  *║ ➤ .impressive <text>*
  *║ ➤ .matrix <text>*
  *║ ➤ .light <text>*
  *║ ➤ .neon <text>*
  *║ ➤ .devil <text>*
  *║ ➤ .purple <text>*
  *║ ➤ .thunder <text>*
  *║ ➤ .leaves <text>*
  *║ ➤ .1917 <text>*
  *║ ➤ .arena <text>*
  *║ ➤ .hacker <text>*
  *║ ➤ .sand <text>*
  *║ ➤ .blackpink <text>*
  *║ ➤ .glitch <text>*
  *║ ➤ .fire <text>*
*╝══════════🔥═════════╚*

*╗══════════🍷═════════╔*
📥*تحميل الوسائط*
  *║ ➤ .play <song_name>*
  *║ ➤ .song <song_name>*
  *║ ➤ .spotify <query>*
  *║ ➤ .instagram <link>*
  *║ ➤ .facebook <link>*
  *║ ➤ .tiktok <link>*
  *║ ➤ .video <song name>*
  *║ ➤ .ytmp4 <Link>*
*╝══════════🔥═════════╚*

*╗══════════🍷═════════╔*
🪔*أخرى*
  *║ ➤ .heart*
  *║ ➤ .horny*
  *║ ➤ .circle*
  *║ ➤ .lgbt*
  *║ ➤ .lolice*
  *║ ➤ .its-so-stupid*
  *║ ➤ .namecard*
  *║ ➤ .oogway*
  *║ ➤ .tweet*
  *║ ➤ .ytcomment*
  *║ ➤ .comrade*
  *║ ➤ .gay*
  *║ ➤ .glass*
  *║ ➤ .jail*
  *║ ➤ .passed*
  *║ ➤ .triggered*
*╝══════════🔥═════════╚*

*╗══════════🍷═════════╔*
🕯️*أنمي*
  *║ ➤ .nom* 
  *║ ➤ .poke* 
  *║ ➤ .cry* 
  *║ ➤ .kiss* 
  *║ ➤ .pat* 
  *║ ➤ .hug* 
  *║ ➤ .wink* 
  *║ ➤ .facepalm*
*╝══════════🔥═════════╚*

*╗══════════🍷═════════╔*
👨🏽‍💻*Github*
  *║ ➤ .git*
  *║ ➤ .github*
  *║ ➤ .sc*
  *║ ➤ .script*
  *║ ➤ .repo*
*╝══════════🔥═════════╚*

📢 *انضم لقناتنا للحصول على التحديثات:*\n
👨‍💻 *المطور:* ${global.developer || 'DarkXecutor'}
`;

        try {
        const imagePath = path.join(__dirname, '../assets/jawad.jpeg');
        
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: helpMessage,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: global.channelId || '120363427092431731@newsletter',
                        newsletterName: settings.botName || 'JAWAD.BOT',
                        serverMessageId: -1
                    }
                }
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { 
                text: helpMessage,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: global.channelId || '120363427092431731@newsletter',
                        newsletterName: settings.botName || 'JAWAD.BOT',
                        serverMessageId: -1
                    } 
                }
            }, { quoted: message });
        }
    } catch (error) {
        console.error('خطأ في أمر المساعدة:', error);
        await sock.sendMessage(chatId, { text: helpMessage }, { quoted: message });
    }
}

module.exports = helpCommand;