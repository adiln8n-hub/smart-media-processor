import { Download, Music, Minimize2, Palette } from 'lucide-react';

const ALL_OPERATIONS = [
  {
    id: 'download',
    label: 'Download File',
    description: 'Download the original file as-is',
    icon: Download,
    color: 'text-indigo-400',
    border: 'border-indigo-500/30',
    allowedTypes: ['video', 'audio', 'image'],
  },
  {
    id: 'video-to-audio',
    label: 'Extract Audio (MP3)',
    description: 'Convert video to MP3 audio file',
    icon: Music,
    color: 'text-green-400',
    border: 'border-green-500/30',
    allowedTypes: ['video'],
  },
  {
    id: 'compress-video',
    label: 'Compress Video',
    description: 'Reduce resolution and file size',
    icon: Minimize2,
    color: 'text-orange-400',
    border: 'border-orange-500/30',
    allowedTypes: ['video'],
  },
  {
    id: 'convert-image',
    label: 'Convert Image',
    description: 'Change image format (JPG/PNG/WebP)',
    icon: Palette,
    color: 'text-blue-400',
    border: 'border-blue-500/30',
    allowedTypes: ['image'],
  },
];

export default function OperationSelector({ mediaType, selected, onSelect }) {
  const available = ALL_OPERATIONS.filter((op) => op.allowedTypes.includes(mediaType));

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
        Choose Operation
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {available.map((op) => {
          const Icon = op.icon;
          const isSelected = selected === op.id;
          return (
            <button
              key={op.id}
              id={`op-${op.id}`}
              onClick={() => onSelect(op.id)}
              className={`op-card text-left ${isSelected ? 'selected' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 p-2 rounded-lg bg-white/5 border ${op.border}`}>
                  <Icon size={16} className={op.color} />
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-200">{op.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{op.description}</p>
                </div>
                {isSelected && (
                  <span className="ml-auto mt-0.5 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {available.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-4">
          No operations available for this file type.
        </p>
      )}
    </div>
  );
}
