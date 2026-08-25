const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const USER_GROUP_DATA = path.join(__dirname, '../data/userGroupData.json');

// تخزين سجل المحادثة ومعلومات المستخدم في الذاكرة
const chatMemory = {
    messages: new Map(), // يخزن آخر 5 رسائل لكل مستخدم
    userInfo: new Map()  // يخزن معلومات المستخدم
};

// تحميل بيانات المستخدمين والمجموعات
function loadUserGroupData() {
    try {
        const dataDir = path.dirname(USER_GROUP_DATA);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        if (!fs.existsSync(USER_GROUP_DATA)) {
            fs.writeFileSync(USER_GROUP_DATA, JSON.stringify({ groups: [], chatbot: {} }, null, 2));
        }
        return JSON.parse(fs.readFileSync(USER_GROUP_DATA, 'utf8'));
    } catch (error) {
        console.error('❌ خطأ في تحميل بيانات المستخدمين:', error.message);
        return { groups: [], chatbot: {} };
    }
}

// حفظ بيانات المستخدمين والمجموعات
function saveUserGroupData(data) {
    try {
        const dataDir = path.dirname(USER_GROUP_DATA);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ خطأ في حفظ بيانات المستخدمين:', error.message);
    }
}

// إضافة تأخير عشوائي بين 2-5 ثواني
function getRandomDelay() {
    return Math.floor(Math.random() * 3000) + 2000;
}

// إظهار مؤشر الكتابة
async function showTyping(sock, chatId) {
    try {
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('composing', chatId);
        await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
    } catch (error) {
        console.error('خطأ في مؤشر الكتابة:', error);
    }
}

// استخراج معلومات المستخدم من الرسائل
function extractUserInfo(message) {
    const info = {};
    
    // استخراج الاسم
    if (message.toLowerCase().includes('اسمي')) {
        info.name = message.split('اسمي')[1].trim().split(' ')[0];
    }
    
    // استخراج العمر
    if (message.toLowerCase().includes('عمري') && message.toLowerCase().includes('سنة')) {
        info.age = message.match(/\d+/)?.[0];
    }
    
    // استخراج الموقع
    if (message.toLowerCase().includes('أسكن في') || message.toLowerCase().includes('أنا من')) {
        info.location = message.split(/(?:أسكن في|أنا من)/i)[1].trim().split(/[.,!?]/)[0];
    }
    
    return info;
}

async function handleChatbotCommand(sock, chatId, message, match) {
    if (!match) {
        await showTyping(sock, chatId);
        return sock.sendMessage(chatId, {
            text: `🤖 *إعدادات بوت المحادثة - JAWAD.BOT*\n\n📌 *الأوامر:*\n*.بوت تفعيل*\nتفعيل بوت المحادثة\n\n*.بوت تعطيل*\nتعطيل بوت المحادثة في هذه المجموعة`,
            quoted: message
        });
    }

    const data = loadUserGroupData();
    
    // الحصول على رقم البوت
    const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    
    // التحقق من أن المرسل هو مطور البوت
    const senderId = message.key.participant || message.participant || message.pushName || message.key.remoteJid;
    const isOwner = senderId === botNumber;

    // إذا كان مطور البوت، السماح فوراً
    if (isOwner) {
        if (match === 'on' || match === 'تفعيل') {
            await showTyping(sock, chatId);
            if (data.chatbot[chatId]) {
                return sock.sendMessage(chatId, { 
                    text: '⚠️ *بوت المحادثة مفعل بالفعل في هذه المجموعة*',
                    quoted: message
                });
            }
            data.chatbot[chatId] = true;
            saveUserGroupData(data);
            console.log(`✅ تم تفعيل بوت المحادثة في المجموعة ${chatId}`);
            return sock.sendMessage(chatId, { 
                text: '🤖 *تم تفعيل بوت المحادثة في هذه المجموعة*\n✨ يمكنكم الآن التحدث معي!',
                quoted: message
            });
        }

        if (match === 'off' || match === 'تعطيل') {
            await showTyping(sock, chatId);
            if (!data.chatbot[chatId]) {
                return sock.sendMessage(chatId, { 
                    text: '⚠️ *بوت المحادثة معطل بالفعل في هذه المجموعة*',
                    quoted: message
                });
            }
            delete data.chatbot[chatId];
            saveUserGroupData(data);
            console.log(`✅ تم تعطيل بوت المحادثة في المجموعة ${chatId}`);
            return sock.sendMessage(chatId, { 
                text: '🤖 *تم تعطيل بوت المحادثة في هذه المجموعة*\n👋 أراكم لاحقاً!',
                quoted: message
            });
        }
    }

    // لغير المطور، التحقق من صلاحيات المشرف
    let isAdmin = false;
    if (chatId.endsWith('@g.us')) {
        try {
            const groupMetadata = await sock.groupMetadata(chatId);
            isAdmin = groupMetadata.participants.some(p => p.id === senderId && (p.admin === 'admin' || p.admin === 'superadmin'));
        } catch (e) {
            console.warn('⚠️ لا يمكن جلب معلومات المجموعة. قد لا يكون البوت مشرفاً.');
        }
    }

    if (!isAdmin && !isOwner) {
        await showTyping(sock, chatId);
        return sock.sendMessage(chatId, {
            text: '⛔ *غير مصرح!*\n👑 فقط مشرفي المجموعة أو مطور البوت يمكنهم استخدام هذا الأمر.',
            quoted: message
        });
    }

    if (match === 'on' || match === 'تفعيل') {
        await showTyping(sock, chatId);
        if (data.chatbot[chatId]) {
            return sock.sendMessage(chatId, { 
                text: '⚠️ *بوت المحادثة مفعل بالفعل في هذه المجموعة*',
                quoted: message
            });
        }
        data.chatbot[chatId] = true;
        saveUserGroupData(data);
        console.log(`✅ تم تفعيل بوت المحادثة في المجموعة ${chatId}`);
        return sock.sendMessage(chatId, { 
            text: '🤖 *تم تفعيل بوت المحادثة في هذه المجموعة*',
            quoted: message
        });
    }

    if (match === 'off' || match === 'تعطيل') {
        await showTyping(sock, chatId);
        if (!data.chatbot[chatId]) {
            return sock.sendMessage(chatId, { 
                text: '⚠️ *بوت المحادثة معطل بالفعل في هذه المجموعة*',
                quoted: message
            });
        }
        delete data.chatbot[chatId];
        saveUserGroupData(data);
        console.log(`✅ تم تعطيل بوت المحادثة في المجموعة ${chatId}`);
        return sock.sendMessage(chatId, { 
            text: '🤖 *تم تعطيل بوت المحادثة في هذه المجموعة*',
            quoted: message
        });
    }

    await showTyping(sock, chatId);
    return sock.sendMessage(chatId, { 
        text: '❌ *أمر غير صالح!*\n📌 استخدم .بوت لمعرفة الاستخدام الصحيح',
        quoted: message
    });
}

async function handleChatbotResponse(sock, chatId, message, userMessage, senderId) {
    const data = loadUserGroupData();
    if (!data.chatbot[chatId]) return;

    try {
        // الحصول على معرف البوت
        const botId = sock.user.id;
        const botNumber = botId.split(':')[0];
        const botLid = sock.user.lid;
        const botJids = [
            botId,
            `${botNumber}@s.whatsapp.net`,
            `${botNumber}@whatsapp.net`,
            `${botNumber}@lid`,
            botLid,
            `${botLid?.split(':')[0]}@lid`
        ];

        let isBotMentioned = false;
        let isReplyToBot = false;

        // التحقق من الإشارات والردود
        if (message.message?.extendedTextMessage) {
            const mentionedJid = message.message.extendedTextMessage.contextInfo?.mentionedJid || [];
            const quotedParticipant = message.message.extendedTextMessage.contextInfo?.participant;
            
            isBotMentioned = mentionedJid.some(jid => {
                const jidNumber = jid.split('@')[0].split(':')[0];
                return botJids.some(botJid => {
                    const botJidNumber = botJid?.split('@')[0]?.split(':')[0];
                    return jidNumber === botJidNumber;
                });
            });
            
            if (quotedParticipant) {
                const cleanQuoted = quotedParticipant.replace(/[:@].*$/, '');
                isReplyToBot = botJids.some(botJid => {
                    const cleanBot = botJid?.replace(/[:@].*$/, '');
                    return cleanBot === cleanQuoted;
                });
            }
        }
        else if (message.message?.conversation) {
            isBotMentioned = userMessage.includes(`@${botNumber}`);
        }

        if (!isBotMentioned && !isReplyToBot) return;

        // تنظيف الرسالة
        let cleanedMessage = userMessage;
        if (isBotMentioned) {
            cleanedMessage = cleanedMessage.replace(new RegExp(`@${botNumber}`, 'g'), '').trim();
        }

        // تهيئة ذاكرة المحادثة للمستخدم
        if (!chatMemory.messages.has(senderId)) {
            chatMemory.messages.set(senderId, []);
            chatMemory.userInfo.set(senderId, {});
        }

        // استخراج وتحديث معلومات المستخدم
        const userInfo = extractUserInfo(cleanedMessage);
        if (Object.keys(userInfo).length > 0) {
            chatMemory.userInfo.set(senderId, {
                ...chatMemory.userInfo.get(senderId),
                ...userInfo
            });
        }

        // إضافة الرسالة إلى السجل
        const messages = chatMemory.messages.get(senderId);
        messages.push(cleanedMessage);
        if (messages.length > 20) {
            messages.shift();
        }
        chatMemory.messages.set(senderId, messages);

        // إظهار مؤشر الكتابة
        await showTyping(sock, chatId);

        // الحصول على رد من الذكاء الاصطناعي
        const response = await getAIResponse(cleanedMessage, {
            messages: chatMemory.messages.get(senderId),
            userInfo: chatMemory.userInfo.get(senderId)
        });

        if (!response) {
            await sock.sendMessage(chatId, { 
                text: "🤔 *همم...*\n⚠️ عذراً، واجهت مشكلة في معالجة طلبك. حاول مرة أخرى!",
                quoted: message
            });
            return;
        }

        // تأخير طبيعي قبل إرسال الرد
        await new Promise(resolve => setTimeout(resolve, getRandomDelay()));

        // إرسال الرد
        await sock.sendMessage(chatId, {
            text: response
        }, { quoted: message });

    } catch (error) {
        console.error('❌ خطأ في رد بوت المحادثة:', error.message);
        
        if (error.message && error.message.includes('No sessions')) {
            console.error('خطأ في الجلسة - تخطي إرسال رسالة الخطأ');
            return;
        }
        
        try {
            await sock.sendMessage(chatId, { 
                text: "😅 *عذراً!* حدث خلل لدي.. ممكن تعيد السؤال؟",
                quoted: message
            });
        } catch (sendError) {
            console.error('فشل في إرسال رسالة خطأ بوت المحادثة:', sendError.message);
        }
    }
}

async function getAIResponse(userMessage, userContext) {
    try {
        const prompt = `
أنت بوت محادثة اسمك "JAWAD.BOT". أنت حقيقي وودود وتتحدث بالعامية العربية.

القواعد الأساسية:
1. استخدم الإيموجيات بشكل طبيعي
2. حافظ على ردود قصيرة - سطر أو سطرين كحد أقصى
3. تحدث بالعامية العربية
4. كن طبيعياً وغير رسمي

نمط الردود:
- إذا شتمك المستخدم، رد عليه بنفس الطريقة 
- إذا كان وقحاً: رد بحزم مع إيموجيات
- إذا كان لطيفاً: كن لطيفاً ومهتماً
- إذا كان مضحكاً: اضحك معه
- إذا كان حزيناً: ادعمه
- إذا غازلك: غازله بشكل طبيعي

معلومات عنك:
- اسمك: JAWAD.BOT
- أنت بوت واتساب عربي
- أنت ودود وتحب مساعدة الناس

سجل المحادثة السابقة:
${userContext.messages.slice(-5).join('\n')}

معلومات المستخدم:
${JSON.stringify(userContext.userInfo, null, 2)}

الرسالة الحالية: ${userMessage}

تذكر: تحدث بشكل طبيعي. كن مختصراً ومفيداً.

JAWAD.BOT:
        `.trim();

        const response = await fetch("https://zellapi.autos/ai/chatbot?text=" + encodeURIComponent(prompt));
        if (!response.ok) throw new Error("فشلت مكالمة API");
        
        const data = await response.json();
        if (!data.status || !data.result) throw new Error("رد API غير صالح");
        
        let cleanedResponse = data.result.trim()
            .replace(/\n\s*\n/g, '\n')
            .trim();
        
        return cleanedResponse;
    } catch (error) {
        console.error("خطأ في API الذكاء الاصطناعي:", error);
        return null;
    }
}

module.exports = {
    handleChatbotCommand,
    handleChatbotResponse
};