const axios = require('axios');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

/**
 * Downloads a file from a URL to a local path.
 * @param {string} url - Source URL
 * @param {string} basePath - Output path without extension
 * @param {function} onProgress - Progress callback (0 to 1)
 * @returns {Promise<string>} - Final file path with extension
 */
async function downloadFile(url, basePath, onProgress) {
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

  // Determine extension from content-type or URL
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
}

module.exports = { downloadFile };
