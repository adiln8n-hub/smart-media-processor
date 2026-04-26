import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import BASE_URL from './utils/api';
import UrlInput from './components/UrlInput';
import MediaPreview from './components/MediaPreview';
import OperationSelector from './components/OperationSelector';
import FormatOptions from './components/FormatOptions';
import ProgressBar from './components/ProgressBar';
import DownloadPanel from './components/DownloadPanel';
import { Zap, Github } from 'lucide-react';

const STEPS = {
  INPUT: 'input',
  ANALYZED: 'analyzed',
  PROCESSING: 'processing',
  DONE: 'done',
};

export default function App() {
  const [step, setStep]           = useState(STEPS.INPUT);
  const [url, setUrl]             = useState('');
  const [mediaInfo, setMediaInfo] = useState(null);
  const [operation, setOperation] = useState('');
  const [format, setFormat]       = useState('');
  const [quality, setQuality]     = useState('720p');
  const [jobId, setJobId]         = useState(null);
  const [progress, setProgress]   = useState({ percent: 0, stage: '', done: false, error: null });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState('');

  const eventSourceRef = useRef(null);

  // Clean up SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);

  // ── Analyze URL ────────────────────────────────
  const handleAnalyze = async (inputUrl) => {
    setError('');
    setIsLoading(true);
    try {
      const { data } = await axios.post(`${BASE_URL}/api/analyze`, { url: inputUrl });
      if (data.type === 'unknown') {
        setError('Could not detect media type. Make sure the URL points to a direct media file (.mp4, .mp3, .jpg, etc.)');
        setIsLoading(false);
        return;
      }
      setUrl(inputUrl);
      setMediaInfo(data);
      setOperation('');
      setFormat('');
      setStep(STEPS.ANALYZED);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze URL. Please check the link and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Start Processing ────────────────────────────
  const handleProcess = async () => {
    if (!operation) {
      setError('Please select an operation first.');
      return;
    }
    setError('');
    setIsLoading(true);
    setProgress({ percent: 0, stage: 'Starting...', done: false, error: null });

    try {
      const { data } = await axios.post(`${BASE_URL}/api/process`, { url, operation, format, quality });
      setJobId(data.jobId);
      setStep(STEPS.PROCESSING);
      startSSE(data.jobId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start processing.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── SSE Progress ────────────────────────────────
  const startSSE = (id) => {
    if (eventSourceRef.current) eventSourceRef.current.close();

    const es = new EventSource(`${BASE_URL}/api/progress/${id}`);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setProgress(data);
      if (data.done || data.error) {
        es.close();
        if (!data.error) {
          setStep(STEPS.DONE);
        } else {
          setError(data.error);
          setStep(STEPS.ANALYZED);
        }
      }
    };

    es.onerror = () => {
      es.close();
      setError('Connection to server lost. Please try again.');
      setStep(STEPS.ANALYZED);
    };
  };

  // ── Reset ───────────────────────────────────────
  const handleReset = () => {
    if (eventSourceRef.current) eventSourceRef.current.close();
    setStep(STEPS.INPUT);
    setUrl('');
    setMediaInfo(null);
    setOperation('');
    setFormat('');
    setQuality('720p');
    setJobId(null);
    setProgress({ percent: 0, stage: '', done: false, error: null });
    setError('');
    setIsLoading(false);
  };

  const handleProcessAnother = () => {
    setStep(STEPS.ANALYZED);
    setOperation('');
    setFormat('');
    setJobId(null);
    setProgress({ percent: 0, stage: '', done: false, error: null });
    setError('');
  };

  return (
    <div className="bg-animated min-h-screen relative">
      {/* Background Orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Header */}
      <header className="relative z-10 pt-10 pb-6 text-center px-4">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Zap size={20} className="text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-800 gradient-text tracking-tight">
            Smart Media Processor
          </h1>
        </div>
        <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
          Download, convert &amp; compress videos, audio and images from any direct URL
        </p>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-2xl mx-auto px-4 pb-16 space-y-5">

        {/* Step 1: URL Input — always visible */}
        <div className={`glass p-6 animate-slide-up ${step !== STEPS.INPUT ? 'opacity-70' : ''}`}>
          <UrlInput
            onAnalyze={handleAnalyze}
            isLoading={isLoading && step === STEPS.INPUT}
            locked={step !== STEPS.INPUT}
            onReset={handleReset}
            currentUrl={url}
          />
          {error && step === STEPS.INPUT && (
            <p className="mt-3 text-red-400 text-sm flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400" />
              {error}
            </p>
          )}
        </div>

        {/* Step 2: Analysis result + Preview */}
        {mediaInfo && step !== STEPS.INPUT && (
          <div className="glass p-6 animate-slide-up">
            <MediaPreview mediaInfo={mediaInfo} />
          </div>
        )}

        {/* Step 3: Operation + Format selector */}
        {mediaInfo && (step === STEPS.ANALYZED) && (
          <div className="glass p-6 animate-slide-up space-y-5">
            <OperationSelector
              mediaType={mediaInfo.type}
              selected={operation}
              onSelect={(op) => { setOperation(op); setFormat(''); setError(''); }}
            />

            {operation && operation !== 'download' && (
              <FormatOptions
                operation={operation}
                format={format}
                quality={quality}
                onFormat={setFormat}
                onQuality={setQuality}
              />
            )}

            {error && (
              <p className="text-red-400 text-sm flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400" />
                {error}
              </p>
            )}

            <button
              id="btn-process"
              className="btn-primary w-full text-base"
              onClick={handleProcess}
              disabled={!operation || isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Extracting Media...
                </span>
              ) : '⚡ Process Now'}
            </button>
          </div>
        )}

        {/* Step 4: Processing */}
        {step === STEPS.PROCESSING && (
          <div className="glass p-6 animate-slide-up">
            <ProgressBar progress={progress} />
          </div>
        )}

        {/* Step 5: Done */}
        {step === STEPS.DONE && (
          <div className="glass p-6 animate-slide-up">
            <DownloadPanel
              jobId={jobId}
              filename={progress.filename}
              onProcessAnother={handleProcessAnother}
              onReset={handleReset}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center pb-8 text-slate-600 text-xs">
        Smart Media Processor &mdash; Built with React + Node.js + FFmpeg
      </footer>
    </div>
  );
}
