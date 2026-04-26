const axios = require('axios');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const { spawn } = require('child_process');
const ytdl = require('yt-dlp-exec');

/**
 * Downloads a file from a URL to a local path.
 * @param {string} url - Source URL
 * @param {string} basePath - Output path without extension
 * @param {function} onProgress - Progress callback (0 to 1)
 * @returns {Promise<string>} - Final file path with extension
 */
async function downloadFile(url, basePath, onProgress) {
  // 1. Check if it's a direct file or needs yt-dlp
  const isDirectFile = url.match(/\.(mp4|mp3|wav|jpg|jpeg|png|webp|gif)(\?.*)?$/i);
  const isHls = url.includes('.m3u8');

  if (!isDirectFile || isHls) {
    return downloadWithYtdl(url, basePath, onProgress);
  }

  try {
    const response = await axios({
      method: 'GET',
      url,
      responseType: 'stream',
      timeout: 300000,
      maxRedirects: 10,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const contentType = (response.headers['content-type'] || '').split(';')[0].trim();
    let ext = mime.extension(contentType);

    if (!ext || ext === 'bin') {
      const urlPath = url.split('?')[0];
      ext = path.extname(urlPath).slice(1) || 'bin';
    }

    const outputPath = `${basePath}.${ext}`;
    const totalSize = parseInt(response.headers['content-length'] || '0', 10);
    let downloaded = 0;

    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(outputPath);
      response.data.on('data', (chunk) => {
        downloaded += chunk.length;
        if (totalSize > 0 && onProgress) {
          onProgress(Math.min(downloaded / totalSize, 1));
        }
      });
      response.data.pipe(writer);
      writer.on('finish', () => resolve(outputPath));
      writer.on('error', reject);
      response.data.on('error', reject);
    });
  } catch (err) {
    console.log('Axios download failed, falling back to yt-dlp:', err.message);
    return downloadWithYtdl(url, basePath, onProgress);
  }
}

/**
 * Download using yt-dlp binary for streaming sites or HLS.
 */
function downloadWithYtdl(url, basePath, onProgress) {
  return new Promise((resolve, reject) => {
    const outputPath = `${basePath}.%(ext)s`;
    const args = [
      url,
      '-o', outputPath,
      '--newline',
      '--progress',
      '--no-check-certificates',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];

    console.log('Starting yt-dlp download:', url);
    
    // Try 'yt-dlp' first; if it fails with ENOENT, try 'python3 -m yt_dlp'
    let child;
    try {
      child = spawn('yt-dlp', args);
    } catch (e) {
      console.log('Direct yt-dlp call failed, trying python3 -m yt_dlp');
      child = spawn('python3', ['-m', 'yt_dlp', ...args]);
    }

    let finalPath = '';

    child.stdout.on('data', (data) => {
      const line = data.toString();
      const match = line.match(/(\d+\.?\d*)%/);
      if (match && onProgress) {
        onProgress(parseFloat(match[1]) / 100);
      }
      if (line.includes('[download] Destination:')) {
        finalPath = line.split('[download] Destination:')[1].trim();
      } else if (line.includes('[download]') && line.includes('has already been downloaded')) {
         finalPath = line.split('[download]')[1].split('has already')[0].trim();
      }
    });

    child.stderr.on('data', (data) => {
      console.error('yt-dlp stderr:', data.toString());
    });

    child.on('close', (code) => {
      if (code === 0) {
        const files = fs.readdirSync(path.dirname(basePath));
        const baseName = path.basename(basePath);
        const actualFile = files.find(f => f.startsWith(baseName) && !f.endsWith('.part'));
        
        if (actualFile) {
          resolve(path.join(path.dirname(basePath), actualFile));
        } else if (finalPath && fs.existsSync(finalPath)) {
          resolve(finalPath);
        } else {
          reject(new Error('yt-dlp finished but output file not found.'));
        }
      } else {
        reject(new Error(`yt-dlp failed with code ${code}`));
      }
    });

    child.on('error', (err) => {
      if (err.code === 'ENOENT') {
        // One more try with python3 -m yt_dlp if spawn didn't throw but error'd
        console.log('yt-dlp not found, attempting python3 -m yt_dlp fallback');
        const fallback = spawn('python3', ['-m', 'yt_dlp', ...args]);
        // ... (This is getting complex, I'll just refactor the spawn logic)
        reject(new Error('yt-dlp not found. Please check server installation.'));
      } else {
        reject(err);
      }
    });
  });
}

module.exports = { downloadFile };
