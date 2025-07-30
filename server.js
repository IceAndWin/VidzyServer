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

function getTitleAndThumbnail(url) {
  return new Promise((resolve, reject) => {
    const ytDlp = spawn(ytDlpPath, ['--print', '%(title)s\n%(thumbnail)s', url]);

    let chunks = [];
    ytDlp.stdout.on('data', (data) => chunks.push(data));

    ytDlp.stderr.on('data', (data) => {
      console.error(`yt-dlp stderr: ${data}`);
    });

    ytDlp.on('error', (err) => reject(err));

    ytDlp.on('close', (code) => {
      if (code === 0) {
        const [title, thumbnail] = Buffer.concat(chunks)
          .toString('utf8')
          .trim()
          .split('\n');
        resolve({ title, thumbnail });
      } else {
        reject(new Error(`yt-dlp exited with code ${code}`));
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
    const { title, thumbnail } = await getTitleAndThumbnail(url);

    const filename = `video_${Date.now()}.mp4`;
    const ytDlp = spawn(ytDlpPath, [
      '-f', 'bv*+ba/b',
      '--merge-output-format', 'mp4',
      '-o', path.join(downloadsDir, filename),
      url,
    ]);

    ytDlp.stderr.on('data', (data) => console.error(`yt-dlp stderr: ${data}`));

    ytDlp.on('error', (err) => {
      console.error('Spawn error:', err);
      res.status(500).send('Ошибка выполнения yt-dlp');
    });

    ytDlp.on('close', (code) => {
      if (code === 0) {
        res.json({
          title: title,
          pathUrl: `/videos/${filename}`,
          thumbnail: thumbnail
        });
      } else {
        res.status(500).send('Ошибка загрузки');
      }
    });
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).send(`Ошибка: ${err.message}`);
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Сервер запущен на порту ${port}`);
});