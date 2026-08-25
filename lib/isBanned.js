const fs = require('fs');
const path = require('path');

// مسار ملف المحظورين
const BANNED_FILE_PATH = path.join(__dirname, '../data/banned.json');

/**
 * تهيئة ملف المحظورين إذا لم يكن موجوداً
 */
function initializeBannedFile() {
    try {
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        if (!fs.existsSync(BANNED_FILE_PATH)) {
            fs.writeFileSync(BANNED_FILE_PATH, JSON.stringify([], null, 2));
        }
    } catch (error) {
        console.error('خطأ في تهيئة ملف المحظورين:', error);
    }
}

/**
 * التحقق مما إذا كان المستخدم محظوراً
 * @param {string} userId - معرف المستخدم المراد التحقق منه
 * @returns {boolean} - true إذا كان محظوراً، false إذا لم يكن
 */
function isBanned(userId) {
    try {
        initializeBannedFile();
        const bannedUsers = JSON.parse(fs.readFileSync(BANNED_FILE_PATH, 'utf8'));
        return bannedUsers.includes(userId);
    } catch (error) {
        console.error('خطأ في التحقق من حالة الحظر:', error);
        return false;
    }
}

/**
 * إضافة مستخدم إلى قائمة المحظورين
 * @param {string} userId - معرف المستخدم المراد حظره
 * @returns {boolean} - true إذا تم الحظر بنجاح
 */
function addBannedUser(userId) {
    try {
        initializeBannedFile();
        const bannedUsers = JSON.parse(fs.readFileSync(BANNED_FILE_PATH, 'utf8'));
        
        if (!bannedUsers.includes(userId)) {
            bannedUsers.push(userId);
            fs.writeFileSync(BANNED_FILE_PATH, JSON.stringify(bannedUsers, null, 2));
        }
        return true;
    } catch (error) {
        console.error('خطأ في إضافة مستخدم محظور:', error);
        return false;
    }
}

/**
 * إزالة مستخدم من قائمة المحظورين
 * @param {string} userId - معرف المستخدم المراد إلغاء حظره
 * @returns {boolean} - true إذا تم إلغاء الحظر بنجاح
 */
function removeBannedUser(userId) {
    try {
        initializeBannedFile();
        const bannedUsers = JSON.parse(fs.readFileSync(BANNED_FILE_PATH, 'utf8'));
        
        const index = bannedUsers.indexOf(userId);
        if (index !== -1) {
            bannedUsers.splice(index, 1);
            fs.writeFileSync(BANNED_FILE_PATH, JSON.stringify(bannedUsers, null, 2));
        }
        return true;
    } catch (error) {
        console.error('خطأ في إزالة مستخدم محظور:', error);
        return false;
    }
}

/**
 * الحصول على قائمة جميع المستخدمين المحظورين
 * @returns {Array} - قائمة معرفات المستخدمين المحظورين
 */
function getBannedUsers() {
    try {
        initializeBannedFile();
        return JSON.parse(fs.readFileSync(BANNED_FILE_PATH, 'utf8'));
    } catch (error) {
        console.error('خطأ في جلب قائمة المحظورين:', error);
        return [];
    }
}

module.exports = { 
    isBanned,
    addBannedUser,
    removeBannedUser,
    getBannedUsers
};