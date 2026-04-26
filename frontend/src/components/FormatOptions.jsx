const VIDEO_QUALITIES = ['360p', '480p', '720p', '1080p'];
const IMAGE_FORMATS   = ['jpg', 'png', 'webp'];

export default function FormatOptions({ operation, format, quality, onFormat, onQuality }) {
  if (operation === 'video-to-audio') {
    return (
      <div className="pt-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Output Format</p>
        <div className="flex gap-2">
          <span className="format-pill selected">MP3</span>
          <span className="text-xs text-slate-500 self-center">192 kbps, high quality</span>
        </div>
      </div>
    );
  }

  if (operation === 'compress-video') {
    return (
      <div className="pt-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Target Quality</p>
        <div className="flex flex-wrap gap-2">
          {VIDEO_QUALITIES.map((q) => (
            <button
              key={q}
              id={`quality-${q}`}
              onClick={() => onQuality(q)}
              className={`format-pill ${quality === q ? 'selected' : ''}`}
            >
              {q}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-600 mt-2">
          {quality === '360p' && 'Smallest file · Good for mobile'}
          {quality === '480p' && 'Small file · Standard definition'}
          {quality === '720p' && 'Balanced · HD quality'}
          {quality === '1080p' && 'Full HD · Largest output'}
        </p>
      </div>
    );
  }

  if (operation === 'convert-image') {
    const defaultFormat = format || 'jpg';
    return (
      <div className="pt-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Output Format</p>
        <div className="flex flex-wrap gap-2">
          {IMAGE_FORMATS.map((f) => (
            <button
              key={f}
              id={`fmt-${f}`}
              onClick={() => onFormat(f)}
              className={`format-pill ${defaultFormat === f ? 'selected' : ''}`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-600 mt-2">
          {defaultFormat === 'jpg'  && 'JPEG — Best for photos, smaller size'}
          {defaultFormat === 'png'  && 'PNG — Lossless, supports transparency'}
          {defaultFormat === 'webp' && 'WebP — Modern format, smallest size'}
        </p>
      </div>
    );
  }

  return null;
}
