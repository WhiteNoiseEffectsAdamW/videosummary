require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { migrate } = require('./db');
const summaryRouter = require('./routes/summary');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/summary', summaryRouter);

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(errorHandler);

async function start() {
  await migrate();

  // Verify yt-dlp is available at startup
  const { execFile } = require('child_process');
  const ytDlp = process.env.YT_DLP_PATH || 'yt-dlp';
  execFile(ytDlp, ['--version'], (err, stdout) => {
    if (err) console.warn('[startup] yt-dlp not found:', err.message);
    else console.log('[startup] yt-dlp version:', stdout.trim());
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
