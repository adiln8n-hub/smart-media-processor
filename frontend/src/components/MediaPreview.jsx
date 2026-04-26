import { Film, Music, Image, FileQuestion } from 'lucide-react';

const TYPE_CONFIG = {
  video: {
    icon: Film,
    label: 'Video',
    color: 'text-red-400',
    badgeClass: 'badge-video',
    gradient: 'from-red-500/20 to-transparent',
  },
  audio: {
    icon: Music,
    label: 'Audio',
    color: 'text-green-400',
    badgeClass: 'badge-audio',
    gradient: 'from-green-500/20 to-transparent',
  },
  image: {
    icon: Image,
    label: 'Image',
    color: 'text-blue-400',
    badgeClass: 'badge-image',
    gradient: 'from-blue-500/20 to-transparent',
  },
  unknown: {
    icon: FileQuestion,
    label: 'Unknown',
    color: 'text-slate-400',
    badgeClass: 'badge-unknown',
    gradient: 'from-slate-500/10 to-transparent',
  },
};

export default function MediaPreview({ mediaInfo }) {
  const { type, filename, contentType, previewUrl } = mediaInfo;
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.unknown;
  const Icon = config.icon;

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${config.gradient} border border-white/10`}>
          <Icon size={20} className={config.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-slate-200 truncate max-w-xs">{filename}</h2>
            <span className={`badge ${config.badgeClass}`}>
              {config.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{contentType}</p>
        </div>
      </div>

      {/* Media Preview */}
      <div className="rounded-xl overflow-hidden bg-black/30 border border-white/5">
        {type === 'video' && (
          <video
            src={previewUrl}
            controls
            className="w-full max-h-60 object-contain"
            preload="metadata"
            crossOrigin="anonymous"
          >
            Your browser does not support video preview.
          </video>
        )}
        {type === 'audio' && (
          <div className="p-6 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-500/20 flex items-center justify-center">
              <Music size={28} className="text-green-400" />
            </div>
            <audio
              src={previewUrl}
              controls
              className="w-full"
              preload="metadata"
              crossOrigin="anonymous"
            />
          </div>
        )}
        {type === 'image' && (
          <div className="flex items-center justify-center bg-black/20 p-2">
            <img
              src={previewUrl}
              alt={filename}
              className="max-h-64 max-w-full object-contain rounded-lg"
              crossOrigin="anonymous"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}
        {type === 'unknown' && (
          <div className="p-8 text-center text-slate-500">
            <FileQuestion size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Preview not available for this file type.</p>
          </div>
        )}
      </div>
    </div>
  );
}
