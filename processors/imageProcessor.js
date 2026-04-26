const sharp = require('sharp');

/**
 * Convert an image to the specified format using Sharp.
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {'jpg'|'jpeg'|'png'|'webp'} format
 * @param {function} onProgress Progress callback (0 to 1)
 */
async function processImage(inputPath, outputPath, format, onProgress) {
  if (onProgress) onProgress(0.1);

  let pipeline = sharp(inputPath);

  switch (format) {
    case 'jpg':
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality: 88, progressive: true });
      break;
    case 'png':
      pipeline = pipeline.png({ compressionLevel: 7, progressive: true });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality: 85, effort: 4 });
      break;
    default:
      pipeline = pipeline.jpeg({ quality: 88 });
  }

  if (onProgress) onProgress(0.5);
  await pipeline.toFile(outputPath);
  if (onProgress) onProgress(1);
}

module.exports = { processImage };
