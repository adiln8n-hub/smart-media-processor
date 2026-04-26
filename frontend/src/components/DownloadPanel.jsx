import { Download, CheckCircle, RotateCcw, Plus } from 'lucide-react';
import BASE_URL from '../utils/api';

export default function DownloadPanel({ jobId, filename, onProcessAnother, onReset }) {
  const downloadUrl = `${BASE_URL}/api/download/${jobId}`;

  return (
    <div className="text-center space-y-5">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-600/20 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle size={32} className="text-emerald-400" />
          </div>
          <div className="absolute inset-0 rounded-full animate-ping bg-emerald-500/10" />
        </div>
      </div>

      {/* Text */}
      <div>
        <h3 className="text-xl font-bold text-white">Processing Complete!</h3>
        <p className="text-slate-400 text-sm mt-1">
          Your file is ready to download
        </p>
        {filename && (
          <p className="text-xs text-slate-500 mt-1 font-mono truncate max-w-xs mx-auto">
            {filename}
          </p>
        )}
      </div>

      {/* Download Button */}
      <a
        id="btn-download"
        href={downloadUrl}
        download={filename || 'output'}
        className="btn-primary inline-flex items-center gap-2.5 text-base mx-auto"
        style={{ display: 'inline-flex' }}
      >
        <Download size={18} />
        Download File
      </a>

      {/* Secondary actions */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <button
          id="btn-process-another"
          onClick={onProcessAnother}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-400 transition-colors"
        >
          <Plus size={13} />
          Process another format
        </button>
        <span className="text-slate-700">·</span>
        <button
          id="btn-start-over"
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-400 transition-colors"
        >
          <RotateCcw size={13} />
          Start over
        </button>
      </div>

      {/* File expiry note */}
      <p className="text-xs text-slate-600 pt-1">
        ⏳ File will be available for 10 minutes after processing
      </p>
    </div>
  );
}
