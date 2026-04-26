import { useState } from 'react';
import { Link, Search, X } from 'lucide-react';

export default function UrlInput({ onAnalyze, isLoading, locked, onReset, currentUrl }) {
  const [value, setValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onAnalyze(trimmed);
  };

  if (locked) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Source URL</p>
          <p className="text-slate-300 text-sm truncate font-mono">{currentUrl}</p>
        </div>
        <button
          onClick={onReset}
          className="flex-shrink-0 flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors border border-white/10 hover:border-red-500/30 rounded-lg px-3 py-2"
          title="Start over"
        >
          <X size={13} />
          Reset
        </button>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="media-url" className="block text-sm font-semibold text-slate-300 mb-3">
        <span className="flex items-center gap-2">
          <Link size={15} className="text-indigo-400" />
          Paste a direct media URL
        </span>
      </label>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          id="media-url"
          type="url"
          className="input-field flex-1"
          placeholder="https://example.com/video.mp4"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isLoading}
          autoFocus
        />
        <button
          id="btn-analyze"
          type="submit"
          className="btn-primary flex items-center gap-2 whitespace-nowrap px-5 py-3 text-sm"
          disabled={isLoading || !value.trim()}
        >
          {isLoading ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Search size={15} />
              Analyze
            </>
          )}
        </button>
      </form>
      <p className="mt-2.5 text-xs text-slate-500">
        Supported: <span className="text-slate-400">MP4, YouTube, xHamster, MP3, JPG &amp; 1000+ sites</span>
      </p>
    </div>
  );
}
