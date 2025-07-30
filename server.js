const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

app.use('/videos', express.static(downloadsDir));

const ytDlpPath = path.join(__dirname, 'yt-dlp');

function getTitleVideo(url) {
  return new Promise((resolve, reject) => {
    console.log('yt-dlp path:', ytDlpPath);
    console.log('File exists:', fs.existsSync(ytDlpPath));
    if (fs.existsSync(ytDlpPath)) {
      console.log('File permissions:', fs.statSync(ytDlpPath).mode.toString(8));
    }

    const ytDlp = spawn(ytDlpPath, ['--get-title', url]);

    let chunks = [];
    ytDlp.stdout.on('data', (data) => {
      chunks.push(data);
    });

    ytDlp.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    ytDlp.on('error', (err) => {
      console.error('Spawn error:', err);
      reject(err);
    });

    ytDlp.on('close', (code) => {
      if (code === 0) {
        const title = Buffer.concat(chunks).toString('utf8').trim();
        resolve(title);
      } else {
        reject('Не удалось получить название видео');
      }
    });
  });
}

app.get("/", (req, res) => {
  res.send("<h1>Hi I am GODDDDD</h1>");
});

app.post('/download', async (req, res) => {
  const url = req.body.url;
  if (!url) return res.status(400).send('URL обязателен');

  try {
    const title = await getTitleVideo(url);
    const filename = `video_${Date.now()}.mp4`;
    const ytDlp = spawn(ytDlpPath, [
      '-f', 'bv*+ba/b',
      '--merge-output-format', 'mp4',
      '-o', path.join(downloadsDir, filename),
      url,
    ]);

    ytDlp.stderr.on('data', (data) => console.error(data.toString()));

    ytDlp.on('error', (err) => {
      console.error('Spawn error:', err);
      res.status(500).send('Ошибка выполнения yt-dlp');
    });

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
  } catch (err) {
    res.status(500).send('Ошибка получения названия видео');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Сервер запущен на порту ${port}`);
});