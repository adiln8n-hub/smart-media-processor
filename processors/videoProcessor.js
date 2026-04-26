const ffmpeg = require('fluent-ffmpeg');

// Try to use ffmpeg-static binary; fall back to system ffmpeg
try {
  const ffmpegStatic = require('ffmpeg-static');
  if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
    console.log('Using ffmpeg-static binary:', ffmpegStatic);
  }
} catch (e) {
  console.log('ffmpeg-static not available, using system ffmpeg');
}

const QUALITY_PRESETS = {
  '360p':  { width: 640,  height: 360,  videoBitrate: '600k',  audioBitrate: '96k'  },
  '480p':  { width: 854,  height: 480,  videoBitrate: '1200k', audioBitrate: '128k' },
  '720p':  { width: 1280, height: 720,  videoBitrate: '2500k', audioBitrate: '128k' },
  '1080p': { width: 1920, height: 1080, videoBitrate: '5000k', audioBitrate: '192k' },
};

/**
 * Process a video file — extract audio or compress to quality preset.
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {'audio'|'compress'} mode
 * @param {string|null} quality  ('360p' | '480p' | '720p' | '1080p')
 * @param {function} onProgress  Progress callback (0 to 1)
 */
function processVideo(inputPath, outputPath, mode, quality, onProgress) {
  return new Promise((resolve, reject) => {
    let cmd = ffmpeg(inputPath);

    if (mode === 'audio') {
      // Extract and convert to MP3
      cmd = cmd
        .noVideo()
        .audioCodec('libmp3lame')
        .audioBitrate(192)
        .format('mp3');
    } else if (mode === 'compress') {
      const preset = QUALITY_PRESETS[quality] || QUALITY_PRESETS['720p'];
      cmd = cmd
        .videoCodec('libx264')
        .size(`${preset.width}x${preset.height}`)
        .videoBitrate(preset.videoBitrate)
        .audioCodec('aac')
        .audioBitrate(preset.audioBitrate)
        .format('mp4')
        .addOption('-movflags', '+faststart')
        .addOption('-preset', 'fast');
    }

    cmd
      .on('progress', (progress) => {
        if (onProgress && progress.percent != null) {
          onProgress(Math.min(progress.percent / 100, 1));
        }
      })
      .on('end', resolve)
      .on('error', (err) => {
        console.error('FFmpeg error:', err.message);
        reject(err);
      })
      .save(outputPath);
  });
}

module.exports = { processVideo };
