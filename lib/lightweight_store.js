const fs = require('fs')
const path = require('path')

const STORE_FILE = path.join(process.cwd(), 'baileys_store.json')

// الإعدادات: الاحتفاظ بآخر 20 رسالة لكل محادثة (قابلة للتعديل) - تقليل استهلاك الرام
let MAX_MESSAGES = 20

// محاولة قراءة الإعدادات من ملف settings
try {
    const settings = require('../settings.js')
    if (settings.maxStoreMessages && typeof settings.maxStoreMessages === 'number') {
        MAX_MESSAGES = settings.maxStoreMessages
    }
} catch (e) {
    // استخدام القيمة الافتراضية إذا لم تتوفر الإعدادات
}

/**
 * مخزن خفيف الوزن للرسائل والجهات الاتصال والمحادثات
 */
const store = {
    messages: {},    // تخزين الرسائل
    contacts: {},    // تخزين جهات الاتصال
    chats: {},       // تخزين المحادثات

    /**
     * قراءة البيانات من ملف التخزين
     * @param {string} filePath - مسار ملف التخزين
     */
    readFromFile(filePath = STORE_FILE) {
        try {
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
                this.contacts = data.contacts || {}
                this.chats = data.chats || {}
                this.messages = data.messages || {}
                
                // تنظيف أي بيانات موجودة لتتناسب مع التنسيق الجديد
                this.cleanupData()
                console.log(`✅ تم تحميل التخزين: ${Object.keys(this.messages).length} محادثة`)
            }
        } catch (e) {
            console.warn('⚠️ فشل في قراءة ملف التخزين:', e.message)
        }
    },

    /**
     * كتابة البيانات إلى ملف التخزين
     * @param {string} filePath - مسار ملف التخزين
     */
    writeToFile(filePath = STORE_FILE) {
        try {
            const data = JSON.stringify({
                contacts: this.contacts,
                chats: this.chats,
                messages: this.messages
            })
            fs.writeFileSync(filePath, data)
        } catch (e) {
            console.warn('⚠️ فشل في كتابة ملف التخزين:', e.message)
        }
    },

    /**
     * تنظيف البيانات القديمة وتوحيد التنسيق
     */
    cleanupData() {
        // تحويل الرسائل من التنسيق القديم إلى الجديد إذا لزم الأمر
        if (this.messages) {
            Object.keys(this.messages).forEach(jid => {
                // إذا كانت الرسائل على شكل كائن وليس مصفوفة (تنسيق قديم)
                if (typeof this.messages[jid] === 'object' && !Array.isArray(this.messages[jid])) {
                    const messages = Object.values(this.messages[jid])
                    this.messages[jid] = messages.slice(-MAX_MESSAGES)
                }
                // إذا كانت المصفوفة أكبر من الحد الأقصى، اقتطاعها
                else if (Array.isArray(this.messages[jid]) && this.messages[jid].length > MAX_MESSAGES) {
                    this.messages[jid] = this.messages[jid].slice(-MAX_MESSAGES)
                }
            })
        }
    },

    /**
     * ربط الأحداث بالتخزين
     * @param {Object} ev - كائن الأحداث من Baileys
     */
    bind(ev) {
        // معالجة الرسائل الجديدة
        ev.on('messages.upsert', ({ messages }) => {
            messages.forEach(msg => {
                if (!msg.key?.remoteJid) return
                const jid = msg.key.remoteJid
                
                if (!this.messages[jid]) {
                    this.messages[jid] = []
                }

                // إضافة الرسالة الجديدة
                this.messages[jid].push(msg)

                // حذف الرسائل القديمة إذا تجاوزت الحد
                if (this.messages[jid].length > MAX_MESSAGES) {
                    this.messages[jid] = this.messages[jid].slice(-MAX_MESSAGES)
                }
            })
        })

        // معالجة تحديثات جهات الاتصال
        ev.on('contacts.update', (contacts) => {
            contacts.forEach(contact => {
                if (contact.id) {
                    this.contacts[contact.id] = {
                        id: contact.id,
                        name: contact.notify || contact.name || ''
                    }
                }
            })
        })

        // معالجة تحديثات المحادثات
        ev.on('chats.set', (chats) => {
            this.chats = {}
            chats.forEach(chat => {
                this.chats[chat.id] = { 
                    id: chat.id, 
                    subject: chat.subject || '' 
                }
            })
        })
    },

    /**
     * تحميل رسالة محددة بواسطة JID ومعرف الرسالة
     * @param {string} jid - معرف المحادثة
     * @param {string} id - معرف الرسالة
     * @returns {Object|null} - الرسالة أو null إذا لم توجد
     */
    async loadMessage(jid, id) {
        return this.messages[jid]?.find(m => m.key.id === id) || null
    },

    /**
     * الحصول على إحصائيات التخزين
     * @returns {Object} - إحصائيات التخزين
     */
    getStats() {
        let totalMessages = 0
        let totalContacts = Object.keys(this.contacts).length
        let totalChats = Object.keys(this.chats).length
        
        Object.values(this.messages).forEach(chatMessages => {
            if (Array.isArray(chatMessages)) {
                totalMessages += chatMessages.length
            }
        })
        
        return {
            messages: totalMessages,
            contacts: totalContacts,
            chats: totalChats,
            maxMessagesPerChat: MAX_MESSAGES
        }
    },

    /**
     * تفريغ التخزين (حذف جميع البيانات)
     */
    clear() {
        this.messages = {}
        this.contacts = {}
        this.chats = {}
        console.log('🗑️ تم تفريغ التخزين')
    },

    /**
     * حذف رسائل محادثة محددة
     * @param {string} jid - معرف المحادثة
     */
    clearChat(jid) {
        if (this.messages[jid]) {
            delete this.messages[jid]
            console.log(`🗑️ تم حذف رسائل المحادثة: ${jid}`)
        }
    }
}

module.exports = store