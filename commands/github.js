const moment = require('moment-timezone');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function githubCommand(sock, chatId, message) {
  try {
    // إظهار تفاعل "جاري التحميل"
    await sock.sendMessage(chatId, {
      react: { text: '🐙', key: message.key }
    });

    // معلومات مستودع JAWAD.BOT
    const repoUrl = 'https://api.github.com/repos/DarkXecutor/jawadbot';
    
    let json = null;
    let isSuccess = false;
    
    // محاولة جلب المعلومات من المستودع
    try {
      const res = await fetch(repoUrl);
      if (res.ok) {
        json = await res.json();
        isSuccess = true;
      }
    } catch (e) {
      console.log('تعذر جلب معلومات المستودع من GitHub:', e.message);
    }
    
    let txt = '';
    
    if (isSuccess && json) {
      // معلومات من GitHub API
      txt = `╭━━━≪•🐙 *مـسـتـودع الـبـوت* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃📦 *الاسم:* ${json.name || 'JAWAD.BOT'}
┃━━━━━━━━━━━━━━━━━━━━━
┃👁️ *المشاهدات:* ${json.watchers_count || 0}
┃📏 *الحجم:* ${((json.size || 0) / 1024).toFixed(2)} ميجابايت
┃🕒 *آخر تحديث:* ${json.updated_at ? moment(json.updated_at).format('DD/MM/YY - HH:mm:ss') : 'غير معروف'}
┃━━━━━━━━━━━━━━━━━━━━━
┃🔗 *الرابط:* ${json.html_url || 'https://github.com/DarkXecutor/jawadbot'}
┃🍴 *النسخ (Forks):* ${json.forks_count || 0}
┃⭐ *النجوم (Stars):* ${json.stargazers_count || 0}
┃━━━━━━━━━━━━━━━━━━━━━
┃👨‍💻 *المطور:* DarkXecutor
┃━━━━━━━━━━━━━━━━━━━━━
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
    } else {
      // معلومات افتراضية إذا تعذر الاتصال بـ GitHub
      txt = `╭━━━≪•🐙 *مـسـتـودع الـبـوت* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃📦 *الاسم:* JAWAD.BOT
┃━━━━━━━━━━━━━━━━━━━━━
┃👁️ *المشاهدات:* غير متاح مؤقتاً
┃📏 *الحجم:* غير متاح مؤقتاً
┃🕒 *آخر تحديث:* غير متاح مؤقتاً
┃━━━━━━━━━━━━━━━━━━━━━
┃🔗 *الرابط:* https://github.com/DarkXecutor/jawadbot
┃🍴 *النسخ (Forks):* غير متاح مؤقتاً
┃⭐ *النجوم (Stars):* غير متاح مؤقتاً
┃━━━━━━━━━━━━━━━━━━━━━
┃👨‍💻 *المطور:* DarkXecutor
┃━━━━━━━━━━━━━━━━━━━━━
┃💡 *يرجى زيارة الرابط لمشاهدة التفاصيل*
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
    }

    // محاولة إرسال صورة البوت إذا كانت موجودة
    const imgPath = path.join(__dirname, '../assets/bot_image.jpg');
    if (fs.existsSync(imgPath)) {
      const imgBuffer = fs.readFileSync(imgPath);
      await sock.sendMessage(chatId, { image: imgBuffer, caption: txt }, { quoted: message });
    } else {
      // إرسال نص فقط إذا لم توجد الصورة
      await sock.sendMessage(chatId, { text: txt }, { quoted: message });
    }
    
    // إظهار تفاعل النجاح
    await sock.sendMessage(chatId, {
      react: { text: '✅', key: message.key }
    });
    
  } catch (error) {
    console.error('خطأ في جلب معلومات المستودع:', error);
    
    // رسالة بديلة في حالة الخطأ
    const errorMsg = `╭━━━≪•🐙 *مـسـتـودع الـبـوت* •≫━━━╮
┃━━━━━━━━━━━━━━━━━━━━━
┃📦 *الاسم:* JAWAD.BOT
┃━━━━━━━━━━━━━━━━━━━━━
┃🔗 *الرابط:* https://github.com/DarkXecutor/jawadbot
┃👨‍💻 *المطور:* DarkXecutor
┃━━━━━━━━━━━━━━━━━━━━━
┃💡 *يمكنك زيارة الرابط لمشاهدة التفاصيل*
╰━━━≪•🤖 *JAWAD.BOT* •≫━━━╯`;
    
    await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
  }
}

module.exports = githubCommand;