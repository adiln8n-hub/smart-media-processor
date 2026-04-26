const express = require('express');
const router = express.Router();
const axios = require('axios');
const mime = require('mime-types');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { jobs, createJob, updateJob, getJob } = require('../jobs');
const { downloadFile } = require('../processors/downloader');
const { processVideo } = require('../processors/videoProcessor');
const { processImage } = require('../processors/imageProcessor');
const { spawn } = require('child_process');

const TEMP_DIR = path.join(os.tmpdir(), 'smart-media-processor');

// Ensure temp dir exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ─── Analyze URL ────────────────────────────────────────────────────────────
router.post('/analyze', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'A valid URL is required.' });
  }

  try {
    // Attempt HEAD first; fallback to partial GET
    let contentType = '';
    let filename = '';

    try {
      const headRes = await axios.head(url, {
        timeout: 12000,
        maxRedirects: 8,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      contentType = headRes.headers['content-type'] || '';
      const disp = headRes.headers['content-disposition'] || '';
      const match = disp.match(/filename[*]?=(?:UTF-8'')?["']?([^"';\r\n]+)/i);
      if (match) filename = decodeURIComponent(match[1].trim());
    } catch (_) {
      // HEAD failed — derive from URL
    }

    // Fallback: detect type from URL extension
    if (!contentType || contentType.startsWith('text/') || contentType === 'application/octet-stream') {
      const urlPath = url.split('?')[0];
      contentType = mime.lookup(urlPath) || contentType || 'application/octet-stream';
    }

    if (!filename) {
      filename = path.basename(url.split('?')[0]) || 'file';
    }

    const ct = contentType.split(';')[0].trim().toLowerCase();
    let type = 'unknown';
    if (ct.startsWith('video/')) type = 'video';
    else if (ct.startsWith('audio/')) type = 'audio';
    else if (ct.startsWith('image/')) type = 'image';

    let ext = mime.extension(ct) || path.extname(filename).replace('.', '') || 'bin';
    let previewUrl = url;

    // ─── Fallback to yt-dlp for streaming sites ─────────────────────────────
    if (type === 'unknown' || ct.includes('text/html')) {
      try {
        console.log(`Attempting yt-dlp analysis for: ${url}`);
        
        const metadata = await new Promise((resolve, reject) => {
          const args = [
            '--dump-json',
            '--no-warnings',
            '--no-check-certificates',
            '--prefer-free-formats',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            '--referer', url,
            '--no-playlist',
            url
          ];
          
          const child = spawn('yt-dlp', args);
          let stdout = '';
          let stderr = '';
          
          child.stdout.on('data', (data) => stdout += data.toString());
          child.stderr.on('data', (data) => stderr += data.toString());
          
          const timeout = setTimeout(() => {
            child.kill();
            reject(new Error('yt-dlp timed out after 45s'));
          }, 45000);

          child.on('error', (err) => {
            clearTimeout(timeout);
            if (err.code === 'ENOENT') {
              // Try fallback to python3 -m yt_dlp
              const fallbackChild = spawn('python3', ['-m', 'yt_dlp', ...args]);
              let fStdout = '';
              let fStderr = '';
              fallbackChild.stdout.on('data', (d) => fStdout += d.toString());
              fallbackChild.stderr.on('data', (d) => fStderr += d.toString());
              fallbackChild.on('close', (c) => {
                if (c === 0) resolve(JSON.parse(fStdout));
                else reject(new Error(`yt-dlp fallback failed: ${fStderr}`));
              });
              fallbackChild.on('error', (e) => reject(new Error(`yt-dlp and fallback both failed: ${err.message} / ${e.message}`)));
            } else {
              reject(err);
            }
          });
          
          child.on('close', (code) => {
            clearTimeout(timeout);
            if (code === 0) {
              try {
                resolve(JSON.parse(stdout));
              } catch (e) {
                reject(new Error('Failed to parse yt-dlp output'));
              }
            } else {
              reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
            }
          });
        });

        if (metadata) {
          type = metadata.vcodec !== 'none' ? 'video' : (metadata.acodec !== 'none' ? 'audio' : 'unknown');
          filename = metadata.title || filename;
          ext = metadata.ext || ext;
          previewUrl = metadata.url || url;
          console.log(`yt-dlp success: ${type} - ${filename}`);
        }
      } catch (ytdlErr) {
        console.error('yt-dlp analysis failed:', ytdlErr.message);
        
        // ─── Manual Fallback for xHamster Mirrors (Last Resort) ─────────────
        if (url.includes('xhhouse') || url.includes('xhamster')) {
          try {
            const htmlRes = await axios.get(url, {
              headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': url 
              }
            });
            const titleMatch = htmlRes.data.match(/"title":"(.*?)"/);
            if (titleMatch) filename = titleMatch[1];
            
            const thumbMatch = htmlRes.data.match(/"thumbURL":"(.*?)"/);
            if (thumbMatch) previewUrl = thumbMatch[1].replace(/\\/g, '');

            const trailerMatch = htmlRes.data.match(/"trailerURL":"(.*?)"/);
            if (trailerMatch) {
              previewUrl = trailerMatch[1].replace(/\\/g, '');
              type = 'video';
              ext = 'mp4';
            }
          } catch (e) {
            console.error('Manual fallback failed:', e.message);
          }
        }
      }
    }

    return res.json({ type, ext, filename, contentType: ct, previewUrl });
  } catch (error) {
    console.error('Analyze error:', error.message);
    return res.status(500).json({ error: `Failed to analyze URL: ${error.message}` });
  }
});

// ─── Start Processing Job ────────────────────────────────────────────────────
router.post('/process', async (req, res) => {
  const { url, operation, format, quality } = req.body;

  if (!url || !operation) {
    return res.status(400).json({ error: 'url and operation are required.' });
  }

  const validOps = ['download', 'video-to-audio', 'compress-video', 'convert-image'];
  if (!validOps.includes(operation)) {
    return res.status(400).json({ error: `Invalid operation: ${operation}` });
  }

  const jobId = uuidv4();
  createJob(jobId);

  // Send jobId immediately, then process in background
  res.json({ jobId });

  processMediaJob(jobId, url, operation, format, quality).catch((err) => {
    console.error(`Job ${jobId} failed:`, err.message);
    updateJob(jobId, { error: err.message, done: true, stage: 'Error' });
  });
});

// ─── Background Media Processor ─────────────────────────────────────────────
async function processMediaJob(jobId, url, operation, format, quality) {
  const inputBase = path.join(TEMP_DIR, `${jobId}_input`);

  try {
    // Step 1: Download
    updateJob(jobId, { stage: 'Downloading file...', percent: 2 });

    const inputFile = await downloadFile(url, inputBase, (progress) => {
      updateJob(jobId, {
        stage: 'Downloading file...',
        percent: Math.round(2 + progress * 38), // 2–40%
      });
    });

    updateJob(jobId, { stage: 'Processing...', percent: 40 });

    let outputPath;
    let outputFilename;

    // Step 2: Process based on operation
    if (operation === 'download') {
      outputPath = inputFile;
      outputFilename = path.basename(inputFile);
      updateJob(jobId, { stage: 'Ready!', percent: 100, done: true, outputPath, filename: outputFilename });
      return;
    }

    if (operation === 'video-to-audio') {
      outputPath = path.join(TEMP_DIR, `${jobId}_output.mp3`);
      outputFilename = `audio_${Date.now()}.mp3`;
      await processVideo(inputFile, outputPath, 'audio', null, (p) => {
        updateJob(jobId, { stage: 'Converting to MP3...', percent: Math.round(40 + p * 60) });
      });
    } else if (operation === 'compress-video') {
      const q = quality || '720p';
      outputPath = path.join(TEMP_DIR, `${jobId}_output.mp4`);
      outputFilename = `video_${q}_${Date.now()}.mp4`;
      await processVideo(inputFile, outputPath, 'compress', q, (p) => {
        updateJob(jobId, { stage: `Compressing to ${q}...`, percent: Math.round(40 + p * 60) });
      });
    } else if (operation === 'convert-image') {
      const fmt = format || 'jpg';
      outputPath = path.join(TEMP_DIR, `${jobId}_output.${fmt}`);
      outputFilename = `image_${Date.now()}.${fmt}`;
      await processImage(inputFile, outputPath, fmt, (p) => {
        updateJob(jobId, { stage: `Converting to ${fmt.toUpperCase()}...`, percent: Math.round(40 + p * 60) });
      });
    }

    updateJob(jobId, { stage: 'Done!', percent: 100, done: true, outputPath, filename: outputFilename });

    // Clean up input file (keep output for download)
    if (inputFile !== outputPath) {
      setTimeout(() => fs.unlink(inputFile, () => {}), 5000);
    }

    // Clean up output after 10 minutes
    setTimeout(() => {
      if (outputPath && fs.existsSync(outputPath)) fs.unlink(outputPath, () => {});
    }, 10 * 60 * 1000);
  } catch (err) {
    // Cleanup on failure
    try { fs.unlinkSync(inputBase + '.*'); } catch (_) {}
    throw err;
  }
}

// ─── SSE Progress Stream ─────────────────────────────────────────────────────
router.get('/progress/:jobId', (req, res) => {
  const { jobId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = () => {
    const job = getJob(jobId);
    if (!job) {
      res.write(`data: ${JSON.stringify({ error: 'Job not found', done: true })}\n\n`);
      clearInterval(interval);
      return res.end();
    }
    res.write(`data: ${JSON.stringify(job)}\n\n`);
    if (job.done || job.error) {
      clearInterval(interval);
      res.end();
    }
  };

  send();
  const interval = setInterval(send, 400);
  req.on('close', () => clearInterval(interval));
});

// ─── Download Processed File ─────────────────────────────────────────────────
router.get('/download/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = getJob(jobId);

  if (!job || !job.outputPath || !fs.existsSync(job.outputPath)) {
    return res.status(404).json({ error: 'File not found or has expired.' });
  }

  const mimeType = mime.lookup(job.outputPath) || 'application/octet-stream';
  const filename = job.filename || path.basename(job.outputPath);

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', mimeType);

  const stat = fs.statSync(job.outputPath);
  res.setHeader('Content-Length', stat.size);

  const stream = fs.createReadStream(job.outputPath);
  stream.pipe(res);
  stream.on('error', (err) => {
    console.error('Stream error:', err.message);
    res.end();
  });
});

// ─── Debug Endpoint ────────────────────────────────────────────────────────
router.get('/debug', async (req, res) => {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  const results = {
    node: process.version,
    platform: process.platform,
    env: process.env.NODE_ENV,
    ffmpeg: 'unknown',
    ytdlp: 'unknown',
    python: 'unknown'
  };
  
  try {
    const { stdout } = await execPromise('ffmpeg -version');
    results.ffmpeg = stdout.split('\n')[0];
  } catch (e) { results.ffmpeg = 'Error: ' + e.message; }
  
  try {
    const { stdout } = await execPromise('yt-dlp --version');
    results.ytdlp = stdout.trim();
  } catch (e) {
    try {
      const { stdout } = await execPromise('python3 -m yt_dlp --version');
      results.ytdlp = 'via python3: ' + stdout.trim();
    } catch (e2) {
      results.ytdlp = 'Error: ' + e.message + ' | Fallback error: ' + e2.message;
    }
  }
  
  try {
    const { stdout } = await execPromise('python3 --version');
    results.python = stdout.trim();
  } catch (e) { results.python = 'Error: ' + e.message; }
  
  res.json(results);
});

module.exports = router;
