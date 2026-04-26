import { Loader2 } from 'lucide-react';

export default function ProgressBar({ progress }) {
  const { percent = 0, stage = 'Processing...', done, error } = progress;

  const stageEmoji = () => {
    if (error) return '❌';
    if (done) return '✅';
    if (stage.includes('Download')) return '⬇️';
    if (stage.includes('Convert')) return '🔄';
    if (stage.includes('Compress')) return '📦';
    if (stage.includes('MP3')) return '🎵';
    return '⚙️';
  };

  return (
    <div className="space-y-4">
      {/* Stage label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!done && !error && (
            <Loader2 size={16} className="text-indigo-400 animate-spin" />
          )}
          <p className="text-sm font-semibold text-slate-200">
            {stageEmoji()} {stage}
          </p>
        </div>
        <span className="text-sm font-bold gradient-text tabular-nums">{percent}%</span>
      </div>

      {/* Progress track */}
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Step labels */}
      <div className="flex justify-between text-xs text-slate-600">
        <span className={percent >= 2  ? 'text-indigo-400' : ''}>Download</span>
        <span className={percent >= 40 ? 'text-indigo-400' : ''}>Process</span>
        <span className={percent >= 100 ? 'text-indigo-400' : ''}>Ready</span>
      </div>

      {error && (
        <div className="mt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      <p className="text-xs text-slate-500 text-center">
        Please keep this tab open while processing…
      </p>
    </div>
  );
}
