const fs = require('fs');
const path = require('path');

const antilinkFilePath = path.join(__dirname, '../data', 'antilinkSettings.json');
const warningsFilePath = path.join(__dirname, '../data', 'antilinkWarnings.json');

// ===================== إعدادات مكافحة الروابط =====================

function loadAntilinkSettings() {
    try {
        if (fs.existsSync(antilinkFilePath)) {
            const data = fs.readFileSync(antilinkFilePath, 'utf8');
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        console.error('خطأ في تحميل إعدادات مكافحة الروابط:', error);
        return {};
    }
}

function saveAntilinkSettings(settings) {
    try {
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(antilinkFilePath, JSON.stringify(settings, null, 2));
    } catch (error) {
        console.error('خطأ في حفظ إعدادات مكافحة الروابط:', error);
    }
}

/**
 * تعيين إعداد مكافحة الروابط لمجموعة
 * @param {string} groupId - معرف المجموعة
 * @param {object} config - كائن الإعدادات { enabled, action }
 */
function setAntilinkSetting(groupId, config) {
    const settings = loadAntilinkSettings();
    settings[groupId] = {
        enabled: config.enabled || false,
        action: config.action || 'delete'
    };
    saveAntilinkSettings(settings);
}

/**
 * الحصول على إعداد مكافحة الروابط لمجموعة
 * @param {string} groupId - معرف المجموعة
 * @returns {object} - كائن الإعدادات { enabled, action }
 */
function getAntilinkSetting(groupId) {
    const settings = loadAntilinkSettings();
    const defaultConfig = { enabled: false, action: 'delete' };
    return settings[groupId] || defaultConfig;
}

/**
 * تفعيل أو تعطيل مكافحة الروابط لمجموعة
 * @param {string} groupId - معرف المجموعة
 * @param {boolean} enabled - تفعيل أو تعطيل
 */
function toggleAntilink(groupId, enabled) {
    const current = getAntilinkSetting(groupId);
    setAntilinkSetting(groupId, { ...current, enabled });
}

/**
 * تعيين إجراء مكافحة الروابط لمجموعة
 * @param {string} groupId - معرف المجموعة
 * @param {string} action - الإجراء (delete, kick, warn)
 */
function setAntilinkAction(groupId, action) {
    const current = getAntilinkSetting(groupId);
    setAntilinkSetting(groupId, { ...current, action });
}

// ===================== تحذيرات مكافحة الروابط =====================

function loadWarnings() {
    try {
        if (fs.existsSync(warningsFilePath)) {
            const data = fs.readFileSync(warningsFilePath, 'utf8');
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        console.error('خطأ في تحميل تحذيرات مكافحة الروابط:', error);
        return {};
    }
}

function saveWarnings(warnings) {
    try {
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(warningsFilePath, JSON.stringify(warnings, null, 2));
    } catch (error) {
        console.error('خطأ في حفظ تحذيرات مكافحة الروابط:', error);
    }
}

/**
 * زيادة عدد تحذيرات مستخدم في مجموعة
 * @param {string} groupId - معرف المجموعة
 * @param {string} userId - معرف المستخدم
 * @returns {number} - عدد التحذيرات الجديد
 */
async function incrementWarningCount(groupId, userId) {
    const warnings = loadWarnings();
    
    if (!warnings[groupId]) {
        warnings[groupId] = {};
    }
    
    if (!warnings[groupId][userId]) {
        warnings[groupId][userId] = 0;
    }
    
    warnings[groupId][userId]++;
    saveWarnings(warnings);
    
    return warnings[groupId][userId];
}

/**
 * إعادة تعيين عدد تحذيرات مستخدم في مجموعة
 * @param {string} groupId - معرف المجموعة
 * @param {string} userId - معرف المستخدم
 */
async function resetWarningCount(groupId, userId) {
    const warnings = loadWarnings();
    
    if (warnings[groupId] && warnings[groupId][userId]) {
        delete warnings[groupId][userId];
        saveWarnings(warnings);
    }
}

/**
 * الحصول على عدد تحذيرات مستخدم في مجموعة
 * @param {string} groupId - معرف المجموعة
 * @param {string} userId - معرف المستخدم
 * @returns {number} - عدد التحذيرات
 */
async function getWarningCount(groupId, userId) {
    const warnings = loadWarnings();
    return warnings[groupId]?.[userId] || 0;
}

module.exports = {
    // إعدادات مكافحة الروابط
    setAntilinkSetting,
    getAntilinkSetting,
    toggleAntilink,
    setAntilinkAction,
    
    // تحذيرات مكافحة الروابط
    incrementWarningCount,
    resetWarningCount,
    getWarningCount
};