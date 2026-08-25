/**
 * JAWAD.BOT - بوت واتساب
 * حقوق النشر © 2025 DarkXecutor
 * 
 * هذا البرنامج مجاني: يمكنك إعادة توزيعه وتعديله
 * وفقاً لرخصة MIT.
 * 
 * الاعتمادات:
 * - مكتبة Baileys بواسطة @adiwajshing
 * - كود الاقتران مستوحى من TechGod143 & DGXEON
 */
const ytdl = require('@distube/ytdl-core');
const yts = require('youtube-yts');
const readline = require('readline');
const ffmpeg = require('fluent-ffmpeg')
const NodeID3 = require('node-id3')
const fs = require('fs');
const { fetchBuffer } = require("./myfunc2")
const ytM = require('node-youtube-music')
const { randomBytes } = require('crypto')
const ytIdRegex = /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\?(?:\S*?&?v\=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/
const path = require('path');

class YTDownloader {
    constructor() {
        this.tmpDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(this.tmpDir)) {
            fs.mkdirSync(this.tmpDir, { recursive: true });
        }
    }

    /**
     * التحقق مما إذا كان الرابط من يوتيوب
     * @param {string|URL} url رابط يوتيوب
     * @returns {boolean} - صحيح إذا كان الرابط من يوتيوب
     */
    static isYTUrl = (url) => {
        return ytIdRegex.test(url)
    }

    /**
     * استخراج معرف الفيديو من الرابط
     * @param {string|URL} url الرابط
     * @returns {string} - معرف الفيديو
     */
    static getVideoID = (url) => {
        if (!this.isYTUrl(url)) throw new Error('هذا ليس رابط يوتيوب صحيح')
        return ytIdRegex.exec(url)[1]
    }

    /**
     * @typedef {Object} IMetadata
     * @property {string} Title عنوان المقطع
     * @property {string} Artist اسم الفنان
     * @property {string} Image رابط الصورة المصغرة
     * @property {string} Album اسم الألبوم
     * @property {string} Year سنة الإصدار
     */

    /**
     * إضافة بيانات تعريفية للملف
     * @param {string} filePath مسار الملف
     * @param {IMetadata} Metadata بيانات التعريف
     */
    static WriteTags = async (filePath, Metadata) => {
        NodeID3.write(
            {
                title: Metadata.Title,
                artist: Metadata.Artist,
                originalArtist: Metadata.Artist,
                image: {
                    mime: 'jpeg',
                    type: {
                        id: 3,
                        name: 'front cover',
                    },
                    imageBuffer: (await fetchBuffer(Metadata.Image)).buffer,
                    description: `غلاف ${Metadata.Title}`,
                },
                album: Metadata.Album,
                year: Metadata.Year || ''
            },
            filePath
        );
    }

    /**
     * البحث عن فيديوهات في يوتيوب
     * @param {string} query كلمة البحث
     * @returns {Promise<Array>} - قائمة الفيديوهات
     */
    static search = async (query, options = {}) => {
        const search = await yts.search({ query, hl: 'ar', gl: 'EG', ...options })
        return search.videos
    }

    /**
     * @typedef {Object} TrackSearchResult
     * @property {boolean} isYtMusic من يوتيوب ميوزك؟
     * @property {string} title عنوان الأغنية
     * @property {string} artist اسم الفنان
     * @property {string} id معرف يوتيوب
     * @property {string} url رابط يوتيوب
     * @property {string} album اسم الألبوم
     * @property {Object} duration المدة {seconds, label}
     * @property {string} image رابط الصورة المصغرة
     */

    /**
     * البحث عن أغنية مع التفاصيل
     * @param {string} query كلمة البحث
     * @returns {Promise<TrackSearchResult[]>}
     */
    static searchTrack = (query) => {
        return new Promise(async (resolve, reject) => {
            try {
                let ytMusic = await ytM.searchMusics(query);
                let result = []
                for (let i = 0; i < ytMusic.length; i++) {
                    result.push({
                        isYtMusic: true,
                        title: `${ytMusic[i].title} - ${ytMusic[i].artists.map(x => x.name).join(' ')}`,
                        artist: ytMusic[i].artists.map(x => x.name).join(' '),
                        id: ytMusic[i].youtubeId,
                        url: 'https://youtu.be/' + ytMusic[i].youtubeId,
                        album: ytMusic[i].album,
                        duration: {
                            seconds: ytMusic[i].duration.totalSeconds,
                            label: ytMusic[i].duration.label
                        },
                        image: ytMusic[i].thumbnailUrl.replace('w120-h120', 'w600-h600')
                    })
                }
                resolve(result)
            } catch (error) {
                reject(error)
            }
        })
    }

    /**
     * @typedef {Object} MusicResult
     * @property {TrackSearchResult} meta بيانات الأغنية
     * @property {string} path مسار الملف
     * @property {number} size حجم الملف
     */

    /**
     * تحميل أغنية مع بيانات تعريفية كاملة
     * @param {string|TrackSearchResult[]} query عنوان الأغنية المطلوب تحميلها
     * @returns {Promise<MusicResult>} - مسار الملف الناتج
     */
    static downloadMusic = async (query) => {
        try {
            const getTrack = Array.isArray(query) ? query : await this.searchTrack(query);
            const search = getTrack[0]
            const videoInfo = await ytdl.getInfo('https://www.youtube.com/watch?v=' + search.id, { lang: 'ar' });
            let stream = ytdl(search.id, { filter: 'audioonly', quality: 140 });
            let songPath = `./temp/audio/${randomBytes(3).toString('hex')}.mp3`
            
            // التأكد من وجود المجلد
            const audioDir = path.join(process.cwd(), 'temp', 'audio');
            if (!fs.existsSync(audioDir)) {
                fs.mkdirSync(audioDir, { recursive: true });
            }
            
            stream.on('error', (err) => console.log(err))

            const file = await new Promise((resolve) => {
                ffmpeg(stream)
                    .audioFrequency(44100)
                    .audioChannels(2)
                    .audioBitrate(128)
                    .audioCodec('libmp3lame')
                    .audioQuality(5)
                    .toFormat('mp3')
                    .save(songPath)
                    .on('end', () => resolve(songPath))
            });
            await this.WriteTags(file, { Title: search.title, Artist: search.artist, Image: search.image, Album: search.album, Year: videoInfo.videoDetails.publishDate.split('-')[0] });
            return {
                meta: search,
                path: file,
                size: fs.statSync(songPath).size
            }
        } catch (error) {
            throw new Error(error)
        }
    }

    /**
     * الحصول على روابط فيديو قابلة للتحميل
     * @param {string|URL} query معرف الفيديو أو رابط يوتيوب
     * @param {string} quality جودة الفيديو
     * @returns {Promise<Object>} - معلومات الفيديو
     */
    static mp4 = async (query, quality = 134) => {
        try {
            if (!query) throw new Error('معرف الفيديو أو رابط يوتيوب مطلوب')
            const videoId = this.isYTUrl(query) ? this.getVideoID(query) : query
            const videoInfo = await ytdl.getInfo('https://www.youtube.com/watch?v=' + videoId, { lang: 'ar' });
            const format = ytdl.chooseFormat(videoInfo.formats, { format: quality, filter: 'videoandaudio' })
            return {
                title: videoInfo.videoDetails.title,
                thumb: videoInfo.videoDetails.thumbnails.slice(-1)[0],
                date: videoInfo.videoDetails.publishDate,
                duration: videoInfo.videoDetails.lengthSeconds,
                channel: videoInfo.videoDetails.ownerChannelName,
                quality: format.qualityLabel,
                contentLength: format.contentLength,
                description: videoInfo.videoDetails.description,
                videoUrl: format.url
            }
        } catch (error) {
            throw error
        }
    }

    /**
     * تحميل من يوتيوب إلى MP3
     * @param {string|URL} url رابط يوتيوب للتحميل إلى MP3
     * @param {IMetadata} metadata بيانات تعريفية للمقطع
     * @param {boolean} autoWriteTags إذا تم التعيين، سيتم كتابة البيانات تلقائياً
     * @returns {Promise<Object>} - معلومات الملف
     */
    static mp3 = async (url, metadata = {}, autoWriteTags = false) => {
        try {
            if (!url) throw new Error('معرف الفيديو أو رابط يوتيوب مطلوب')
            url = this.isYTUrl(url) ? 'https://www.youtube.com/watch?v=' + this.getVideoID(url) : url
            const { videoDetails } = await ytdl.getInfo(url, { lang: 'ar' });
            let stream = ytdl(url, { filter: 'audioonly', quality: 140 });
            let songPath = `./temp/audio/${randomBytes(3).toString('hex')}.mp3`
            
            // التأكد من وجود المجلد
            const audioDir = path.join(process.cwd(), 'temp', 'audio');
            if (!fs.existsSync(audioDir)) {
                fs.mkdirSync(audioDir, { recursive: true });
            }

            let starttime;
            stream.once('response', () => {
                starttime = Date.now();
            });
            stream.on('progress', (chunkLength, downloaded, total) => {
                const percent = downloaded / total;
                const downloadedMinutes = (Date.now() - starttime) / 1000 / 60;
                const estimatedDownloadTime = (downloadedMinutes / percent) - downloadedMinutes;
                readline.cursorTo(process.stdout, 0);
                process.stdout.write(`${(percent * 100).toFixed(2)}% تم التحميل `);
                process.stdout.write(`(${(downloaded / 1024 / 1024).toFixed(2)}MB من ${(total / 1024 / 1024).toFixed(2)}MB)\n`);
                process.stdout.write(`المدة: ${downloadedMinutes.toFixed(2)} دقائق`);
                process.stdout.write(`, الوقت المتبقي: ${estimatedDownloadTime.toFixed(2)} دقائق `);
                readline.moveCursor(process.stdout, 0, -1);
            });
            stream.on('end', () => process.stdout.write('\n\n'));
            stream.on('error', (err) => console.log(err))

            const file = await new Promise((resolve) => {
                ffmpeg(stream)
                    .audioFrequency(44100)
                    .audioChannels(2)
                    .audioBitrate(128)
                    .audioCodec('libmp3lame')
                    .audioQuality(5)
                    .toFormat('mp3')
                    .save(songPath)
                    .on('end', () => {
                        resolve(songPath)
                    })
            });
            if (Object.keys(metadata).length !== 0) {
                await this.WriteTags(file, metadata)
            }
            if (autoWriteTags) {
                await this.WriteTags(file, { Title: videoDetails.title, Album: videoDetails.author.name, Year: videoDetails.publishDate.split('-')[0], Image: videoDetails.thumbnails.slice(-1)[0].url })
            }
            return {
                meta: {
                    title: videoDetails.title,
                    channel: videoDetails.author.name,
                    seconds: videoDetails.lengthSeconds,
                    image: videoDetails.thumbnails.slice(-1)[0].url
                },
                path: file,
                size: fs.statSync(songPath).size
            }
        } catch (error) {
            throw error
        }
    }

    async mp3(url) {
        try {
            const info = await ytdl.getInfo(url);
            const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
            
            const fileName = `${Date.now()}.mp3`;
            const filePath = path.join(this.tmpDir, fileName);

            return new Promise((resolve, reject) => {
                const stream = ytdl(url, {
                    quality: 'highestaudio',
                    filter: 'audioonly'
                });

                ffmpeg(stream)
                    .audioBitrate(128)
                    .toFormat('mp3')
                    .save(filePath)
                    .on('end', () => {
                        resolve({
                            path: filePath,
                            meta: {
                                title: info.videoDetails.title,
                                thumbnail: info.videoDetails.thumbnails[0].url
                            }
                        });
                    })
                    .on('error', (err) => reject(err));
            });
        } catch (error) {
            console.error('خطأ في تحميل الصوت:', error);
            throw error;
        }
    }
}

module.exports = new YTDownloader();