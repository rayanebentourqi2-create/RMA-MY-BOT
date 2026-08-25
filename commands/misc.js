const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { uploadImage } = require('../lib/uploadImage');

async function getQuotedOrOwnImageUrl(sock, message) {
    // 1) صورة مقتبسة (أولوية أعلى)
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quoted?.imageMessage) {
        const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        return await uploadImage(buffer);
    }

    // 2) صورة في الرسالة الحالية
    if (message.message?.imageMessage) {
        const stream = await downloadContentFromMessage(message.message.imageMessage, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        return await uploadImage(buffer);
    }

    // 3) صورة المستخدم المشار إليه أو المرسل
    let targetJid;
    const ctx = message.message?.extendedTextMessage?.contextInfo;
    if (ctx?.mentionedJid?.length > 0) {
        targetJid = ctx.mentionedJid[0];
    } else if (ctx?.participant) {
        targetJid = ctx.participant;
    } else {
        targetJid = message.key.participant || message.key.remoteJid;
    }

    try {
        const url = await sock.profilePictureUrl(targetJid, 'image');
        return url;
    } catch {
        return 'https://i.imgur.com/2wzGhpF.png';
    }
}

async function handleHeart(sock, chatId, message) {
    try {
        const avatarUrl = await getQuotedOrOwnImageUrl(sock, message);
        const url = `https://api.some-random-api.com/canvas/misc/heart?avatar=${encodeURIComponent(avatarUrl)}`;
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        await sock.sendMessage(chatId, { image: Buffer.from(response.data) }, { quoted: message });
    } catch (error) {
        console.error('خطأ في أمر القلب:', error);
        await sock.sendMessage(chatId, { text: '❌ فشل إنشاء صورة القلب. حاول مرة أخرى لاحقاً.' }, { quoted: message });
    }
}

async function miscCommand(sock, chatId, message, args) {
    const sub = (args[0] || '').toLowerCase();
    const rest = args.slice(1);

    async function simpleAvatarOnly(endpoint, title = '') {
        const avatarUrl = await getQuotedOrOwnImageUrl(sock, message);
        const url = `https://api.some-random-api.com/canvas/misc/${endpoint}?avatar=${encodeURIComponent(avatarUrl)}`;
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        
        const caption = title ? `✨ *${title} - JAWAD.BOT*` : `✨ *تأثير ${endpoint} - JAWAD.BOT*`;
        await sock.sendMessage(chatId, { 
            image: Buffer.from(response.data),
            caption: caption
        }, { quoted: message });
    }

    try {
        switch (sub) {
            case 'heart':
            case 'قلب':
                await simpleAvatarOnly('heart', 'قلب 💖');
                break;
            
            case 'horny':
            case 'مثير':
                await simpleAvatarOnly('horny', 'مثير 😈');
                break;
            case 'circle':
            case 'دائرة':
                await simpleAvatarOnly('circle', 'دائرة ⭕');
                break;
            case 'lgbt':
            case 'قوس قزح':
                await simpleAvatarOnly('lgbt', 'قوس قزح 🏳️‍🌈');
                break;
            case 'lied':
                await simpleAvatarOnly('lied', 'كذبة 🤥');
                break;
            case 'lolice':
                await simpleAvatarOnly('lolice', 'شرطة 😎');
                break;
            case 'simpcard':
                await simpleAvatarOnly('simpcard', 'بطاقة سيمب 💀');
                break;
            case 'tonikawa':
                await simpleAvatarOnly('tonikawa', 'تونيكاوا 💕');
                break;

            case 'its-so-stupid':
            case 'غبي': {
                const dog = rest.join(' ').trim();
                if (!dog) {
                    await sock.sendMessage(chatId, { text: '📌 *الاستخدام:*\n.غبي <نص>' }, { quoted: message });
                    return;
                }
                const avatarUrl = await getQuotedOrOwnImageUrl(sock, message);
                const url = `https://api.some-random-api.com/canvas/misc/its-so-stupid?dog=${encodeURIComponent(dog)}&avatar=${encodeURIComponent(avatarUrl)}`;
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                await sock.sendMessage(chatId, { 
                    image: Buffer.from(response.data),
                    caption: `🐶 *غبي جداً - JAWAD.BOT*`
                }, { quoted: message });
                break;
            }

            case 'namecard':
            case 'بطاقة': {
                const joined = rest.join(' ');
                const [username, birthday, description] = joined.split('|').map(s => (s || '').trim());
                if (!username || !birthday) {
                    await sock.sendMessage(chatId, { text: '📌 *الاستخدام:*\n.بطاقة الاسم|تاريخ الميلاد|وصف(اختياري)' }, { quoted: message });
                    return;
                }
                const avatarUrl = await getQuotedOrOwnImageUrl(sock, message);
                const params = new URLSearchParams({ username, birthday, avatar: avatarUrl });
                if (description) params.append('description', description);
                const url = `https://api.some-random-api.com/canvas/misc/namecard?${params.toString()}`;
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                await sock.sendMessage(chatId, { 
                    image: Buffer.from(response.data),
                    caption: `🪪 *بطاقة تعريف - JAWAD.BOT*`
                }, { quoted: message });
                break;
            }

            case 'oogway':
            case 'oogway2':
            case 'حكمة': {
                const quote = rest.join(' ').trim();
                if (!quote) {
                    await sock.sendMessage(chatId, { text: `📌 *الاستخدام:*\n.حكمة <نص الحكمة>` }, { quoted: message });
                    return;
                }
                const avatarUrl = await getQuotedOrOwnImageUrl(sock, message);
                const url = `https://api.some-random-api.com/canvas/misc/oogway?quote=${encodeURIComponent(quote)}&avatar=${encodeURIComponent(avatarUrl)}`;
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                await sock.sendMessage(chatId, { 
                    image: Buffer.from(response.data),
                    caption: `🐢 *حكمة السيد أوجواي - JAWAD.BOT*`
                }, { quoted: message });
                break;
            }

            case 'tweet':
            case 'تغريدة': {
                const joined = rest.join(' ');
                const [displayname, username, comment, theme] = joined.split('|').map(s => (s || '').trim());
                if (!displayname || !username || !comment) {
                    await sock.sendMessage(chatId, { text: '📌 *الاستخدام:*\n.تغريدة الاسم|المستخدم|التعليق|الخلفية(light/dark)' }, { quoted: message });
                    return;
                }
                const avatarUrl = await getQuotedOrOwnImageUrl(sock, message);
                const params = new URLSearchParams({ displayname, username, comment, avatar: avatarUrl });
                if (theme) params.append('theme', theme);
                const url = `https://api.some-random-api.com/canvas/misc/tweet?${params.toString()}`;
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                await sock.sendMessage(chatId, { 
                    image: Buffer.from(response.data),
                    caption: `🐦 *تغريدة - JAWAD.BOT*`
                }, { quoted: message });
                break;
            }

            case 'youtube-comment':
            case 'تعليق': {
                const joined = rest.join(' ');
                const [username, comment] = joined.split('|').map(s => (s || '').trim());
                if (!username || !comment) {
                    await sock.sendMessage(chatId, { text: '📌 *الاستخدام:*\n.تعليق المستخدم|التعليق' }, { quoted: message });
                    return;
                }
                const avatarUrl = await getQuotedOrOwnImageUrl(sock, message);
                const params = new URLSearchParams({ username, comment, avatar: avatarUrl });
                const url = `https://api.some-random-api.com/canvas/misc/youtube-comment?${params.toString()}`;
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                await sock.sendMessage(chatId, { 
                    image: Buffer.from(response.data),
                    caption: `▶️ *تعليق يوتيوب - JAWAD.BOT*`
                }, { quoted: message });
                break;
            }

            case 'comrade':
            case 'رفيق':
            case 'gay':
            case 'مثلي':
            case 'glass':
            case 'زجاج':
            case 'jail':
            case 'سجن':
            case 'passed':
            case 'تخطى':
            case 'triggered':
            case 'منفعل': {
                const avatarUrl = await getQuotedOrOwnImageUrl(sock, message);
                let endpoint = sub;
                if (sub === 'رفيق') endpoint = 'comrade';
                if (sub === 'مثلي') endpoint = 'gay';
                if (sub === 'زجاج') endpoint = 'glass';
                if (sub === 'سجن') endpoint = 'jail';
                if (sub === 'تخطى') endpoint = 'passed';
                if (sub === 'منفعل') endpoint = 'triggered';
                
                const titles = {
                    'comrade': 'رفيق 🔴',
                    'gay': 'قوس قزح 🏳️‍🌈',
                    'glass': 'زجاج 🥛',
                    'jail': 'سجن 🚔',
                    'passed': 'تخطى ✔️',
                    'triggered': 'منفعل 😤'
                };
                
                const url = `https://api.some-random-api.com/canvas/overlay/${endpoint}?avatar=${encodeURIComponent(avatarUrl)}`;
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                await sock.sendMessage(chatId, { 
                    image: Buffer.from(response.data),
                    caption: `✨ *${titles[endpoint] || endpoint} - JAWAD.BOT*`
                }, { quoted: message });
                break;
            }

            default:
                await sock.sendMessage(chatId, { 
                    text: `🎨 *أوامر التأثيرات - JAWAD.BOT*\n\n📌 *الأوامر المتاحة:*\n.قلب - صورة قلب\n.مثير - تأثير مثير\n.دائرة - صورة دائرية\n.قوس قزح - تأثير قوس قزح\n.غبي <نص> - صورة "غبي جداً"\n.بطاقة الاسم|الميلاد|وصف - بطاقة تعريف\n.حكمة <نص> - حكمة السيد أوجواي\n.تغريدة الاسم|المستخدم|التعليق|خلفية - تغريدة وهمية\n.تعليق المستخدم|التعليق - تعليق يوتيوب وهمي\n.رفيق - تأثير رفيق\n.مثلي - تأثير قوس قزح\n.زجاج - تأثير زجاج\n.سجن - تأثير سجن\n.تخطى - تأثير تخطى\n.منفعل - تأثير منفعل`
                }, { quoted: message });
                break;
        }
    } catch (error) {
        console.error('خطأ في الأمر المتنوع:', error);
        await sock.sendMessage(chatId, { text: '❌ فشل إنشاء الصورة. تحقق من المعاملات وحاول مرة أخرى.' }, { quoted: message });
    }
}

module.exports = { miscCommand, handleHeart };