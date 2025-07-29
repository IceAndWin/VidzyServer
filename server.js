const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const iconv = require('iconv-lite');
const app = express();
const os = require('os');
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());



const buffer = Buffer.concat(chunks);
const title = os.platform() === 'win32'
    ? iconv.decode(buffer, 'win1251').trim()
    : buffer.toString('utf8').trim();


// Проверка и создание папки
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

// Отдача видео
app.use('/videos', express.static(downloadsDir));




// Получение названия видео по URL
function getTitleVideo(url) {
    return new Promise((resolve, reject) => {
        const ytDlp = spawn('./yt-dlp', ['--get-title', url]);


        let chunks = [];
        ytDlp.stdout.on('data', (data) => {
            chunks.push(data);
        });

        ytDlp.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        ytDlp.on('close', (code) => {
            if (code === 0) {
                const buffer = Buffer.concat(chunks);
                const title = os.platform() === 'win32'
                    ? iconv.decode(buffer, 'win1251').trim()
                    : buffer.toString('utf8').trim();
                resolve(title);
            } else {
                reject('Не удалось получить название видео');
            }
        });
    });
}

// Запрос на скачивание
app.post('/download', async (req, res) => {
    const url = req.body.url;
    if (!url) return res.status(400).send('URL обязателен');
    const title = await getTitleVideo(url);
    const filename = `video_${Date.now()}.mp4`;
    const ytDlp = spawn('./yt-dlp', [
        '-f', 'bv*+ba/b',
        '--merge-output-format', 'mp4',
        '-o', `downloads/${filename}`,
        url,
    ]);


    ytDlp.stderr.on('data', (data) => console.error(data.toString()));

    ytDlp.on('close', (code) => {
        if (code === 0) {
            res.json({
                title: title,
                pathUrl: `/videos/${filename}`,
            });
        } else {
            res.status(500).send('Ошибка загрузки');
        }
    });
});

app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});
