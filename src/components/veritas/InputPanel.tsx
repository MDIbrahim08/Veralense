import { useState, useRef, useCallback } from 'react';
import { ShinyButton } from '@/components/veritas/ShinyButton';

const DEMOS = [
  {
    label: '📊 Conflict Scenario',
    text: "Recent reports suggest that the merger between GlobalTech and Stellar Dynamics has been finalized as of last Tuesday. However, the Federal Trade Commission issued a statement claiming the deal is still under regulatory review for antitrust violations. Meanwhile, the CEO of GlobalTech, Sarah Jenkins, was seen in a deepfake-style video announcing a new dividend payout before the news was confirmed.",
  },
  {
    label: '🧪 Scientific Claims',
    text: 'A new clinical study by the Zurich Institute indicates that Vitamin B17 is a miracle cure for all types of stage-4 cancer, but peer-reviewed journals have rejected the findings citing lack of evidence. The World Health Organization recommends at least 150 minutes of moderate aerobic activity per week. Space-X successfully landed its first human crew on Mars in late 2024.',
  },
  {
    label: '📰 Reputable News Snippet',
    text: 'The Federal Reserve held interest rates steady at its latest meeting in March 2024, citing ongoing concerns about inflation. Apple released the Vision Pro headset in the US on February 2, 2024, with a starting price of $3,499. NASA\'s James Webb Telescope has captured high-resolution images of the Pillars of Creation.',
  },
];

interface InputPanelProps {
  onSubmit: (text: string, url?: string, images?: string[]) => void;
  onFetchUrl: (url: string) => Promise<{ text: string; images: string[] }>;
  isLoading: boolean;
}

export function InputPanel({ onSubmit, onFetchUrl, isLoading }: InputPanelProps) {
  const [mode, setMode] = useState<'text' | 'url'>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [urlPreview, setUrlPreview] = useState('');
  const [urlText, setUrlText] = useState('');
  const [urlImages, setUrlImages] = useState<string[]>([]);
  const [urlError, setUrlError] = useState('');
  const [fetching, setFetching] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [localImage, setLocalImage] = useState<string | null>(null);
  const [localImageBase64, setLocalImageBase64] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  const [recognitionLang, setRecognitionLang] = useState('en-US');

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser. Please use Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = recognitionLang;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      setText(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => setIsRecording(false);

    recognition.start();
    setRecognitionInstance(recognition);
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (recognitionInstance) recognitionInstance.stop();
    setIsRecording(false);
  };

  const handleFetchUrl = async () => {
    setFetching(true);
    setUrlError('');
    try {
      const result = await onFetchUrl(url);
      setUrlText(result.text);
      setUrlImages(result.images || []);
      setUrlPreview(result.text.slice(0, 200));
    } catch (e: any) {
      setUrlError(e.message || 'Could not fetch article. Please paste the text directly.');
    } finally {
      setFetching(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLocalImage(base64);
        setLocalImageBase64(base64.split(',')[1]); // Strip prefix
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    const inputText = mode === 'text' ? text : urlText;
    if (!inputText.trim() && !localImageBase64) return;
    
    const finalParams: any = {
      text: inputText || "Analyze this image for AI manipulation.",
      url: mode === 'url' ? url : undefined,
      images: mode === 'url' ? urlImages : (localImageBase64 ? [`base64:${localImageBase64}`] : undefined)
    };
    
    onSubmit(finalParams.text, finalParams.url, finalParams.images);
  };

  const handleDemo = (demo: typeof DEMOS[0]) => {
    setMode('text');
    setText(demo.text);
    setLocalImage(null);
    setLocalImageBase64(null);
    setIsDemoMode(true);
    setTimeout(() => {
      onSubmit(demo.text);
    }, 600);
  };

  const btnClass = "px-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-foreground hover:bg-elevated active:scale-[0.97] transition-all";

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="flex gap-2">
        {(['text', 'url'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.97] ${
              mode === m
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-muted-foreground hover:text-foreground border border-transparent'
            }`}
          >
            {m === 'text' ? 'Plain Text' : 'URL Extraction'}
          </button>
        ))}
      </div>

      <div className="glass-card p-6 space-y-6">
        {mode === 'text' ? (
          <div className="space-y-4">
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => { setText(e.target.value); setIsDemoMode(false); }}
                placeholder="Paste a news article, essay, or AI-generated content to verify..."
                className="w-full min-h-[160px] p-4 bg-elevated/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground resize-y font-sans text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                rows={6}
              />
              
              <div className="absolute bottom-3 right-3 flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-mono">
                  {text.length} chars
                </span>
                <div className="h-4 w-[1px] bg-border" />
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-1.5 rounded-full transition-all ${
                    isRecording 
                      ? 'bg-destructive/20 text-destructive animate-pulse ring-4 ring-destructive/10' 
                      : 'bg-primary/10 text-primary hover:bg-primary/20'
                  }`}
                  title={isRecording ? 'Stop Recording' : 'Voice Input'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>
                  </svg>
                </button>
              </div>

              {isRecording && (
                <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-destructive/10 text-destructive text-[10px] font-bold uppercase tracking-widest rounded-full animate-fade-in">
                  <span className="w-1.5 h-1.5 bg-destructive rounded-full animate-pulse" />
                  Listening...
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">
                      Input Language
                    </label>
                    <select
                      value={recognitionLang}
                      onChange={(e) => setRecognitionLang(e.target.value)}
                      className="w-full px-3 py-2 bg-elevated border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="en-US">English (US)</option>
                      <option value="hi-IN">Hindi (हिंदी)</option>
                      <option value="kn-IN">Kannada (ಕನ್ನಡ)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">
                      Media Analysis
                    </label>
                    <div className="flex items-center gap-2">
                       <label className="cursor-pointer group flex-1">
                        <div className="flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg border border-primary/20 hover:bg-primary/20 transition-all text-xs font-semibold">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                          {localImage ? 'Change' : 'Upload'}
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                      {localImage && (
                        <button 
                          onClick={() => { setLocalImage(null); setLocalImageBase64(null); }}
                          className="p-2 text-muted-foreground hover:text-destructive transition-colors bg-elevated rounded-lg"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {localImage && (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border bg-black/20 shadow-inner group">
                  <img src={localImage} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-[8px] text-white font-bold px-1 py-0.5 bg-black/40 rounded">IMG</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setUrlError(''); }}
                placeholder="https://news.example.com/breaking-article"
                className="flex-1 px-4 py-3 bg-elevated/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <ShinyButton
                onClick={handleFetchUrl}
                disabled={!url.trim() || fetching}
              >
                {fetching ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Fetching…</span> : 'Fetch Article'}
              </ShinyButton>
            </div>
            {urlError && <p className="text-destructive text-sm font-medium">{urlError}</p>}
            {urlPreview && (
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 animate-fade-in">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1.5 opacity-60">Article Preview</p>
                <p className="text-sm text-foreground/90 leading-relaxed italic">"{urlPreview}..."</p>
                {urlImages.length > 0 && (
                  <p className="mt-2 text-xs text-primary/70 font-medium">Found {urlImages.length} images for analysis</p>
                )}
              </div>
            )}
          </div>
        )}

        <ShinyButton
          onClick={handleSubmit}
          disabled={isLoading || (mode === 'text' ? (!text.trim() && !localImageBase64) : !urlText.trim())}
          className="w-full"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
              Executing Verification Pipeline…
            </span>
          ) : '⚡ Verify Claims'}
        </ShinyButton>
      </div>

      <div className="flex flex-col items-center gap-4">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Quick Demo Scenarios</p>
        <div className="flex flex-wrap justify-center gap-2">
          {DEMOS.map((demo) => (
            <button
              key={demo.label}
              onClick={() => handleDemo(demo)}
              disabled={isLoading}
              className="px-4 py-2 text-xs bg-surface border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/40 active:scale-[0.97] transition-all disabled:opacity-40"
            >
              {demo.label}
            </button>
          ))}
        </div>
      </div>

      {isDemoMode && (
        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full">
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
          Demo mode
        </div>
      )}
    </div>
  );
}
