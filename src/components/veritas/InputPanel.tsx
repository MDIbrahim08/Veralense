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

  // VERALENS VISION: Camera & OCR Scanning
  const [isScanning, setIsScanning] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // VERASUGGEST: AI Autocorrect
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const suggestTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getAiSuggestion = async (input: string) => {
    if (input.length < 10) return;
    setIsSuggesting(true);
    try {
      const GROQ_KEY = (import.meta as any).env?.VITE_GROQ_API_KEY;
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{
            role: "system",
            content: "You are a professional editor. If the input text has obvious transcription errors, factual spelling mistakes (especially names), or major grammar issues, return ONLY the corrected version. If the text is fine, return exactly 'OK'. Max 50 words. Do NOT add preamble."
          }, {
            role: "user",
            content: input
          }]
        })
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices[0].message.content.trim();
        if (content !== 'OK' && content !== input) {
          setSuggestion(content);
        } else {
          setSuggestion(null);
        }
      }
    } catch (err) { /* ignore */ }
    finally { setIsSuggesting(false); }
  };

  const handleTextChange = (val: string) => {
    setText(val);
    setSuggestion(null);
    setIsDemoMode(false);
    
    if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current);
    suggestTimeoutRef.current = setTimeout(() => getAiSuggestion(val), 2000);
  };

  const startCamera = async () => {
    try {
      setIsScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Standard for mobile scanning
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      alert("Camera access denied or unavailable.");
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsScanning(false);
    setCapturedImageBase64(null);
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx?.drawImage(videoRef.current, 0, 0);
    setCapturedImageBase64(canvas.toDataURL('image/jpeg'));
  };

  const analyzeOcr = async () => {
    if (!capturedImageBase64) return;
    
    const GEMINI_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!GEMINI_KEY) {
      alert("⚠️ VeraScan Guard: VITE_GEMINI_API_KEY not found in this build. Please confirm it's in Netlify settings and REDEPLOY.");
      setIsOcrProcessing(false);
      return;
    }

    setIsOcrProcessing(true);
    const base64 = capturedImageBase64.split(',')[1];

    try {
      // Final specific fix: use the exact standard model gemini-1.5-flash
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Extract ALL text from this document. Return ONLY plain text." },
              { inline_data: { mime_type: "image/jpeg", data: base64 } }
            ]
          }]
        })
      });
      
      const data = await res.json();
      if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const extractedText = data.candidates[0].content.parts[0].text;
        handleTextChange(extractedText);
        stopCamera();
      } else {
        throw new Error(data.error?.message || "Extraction failed. Check API key and rate limits.");
      }
    } catch (err: any) {
      console.warn("Gemini Failed, activating Global OCR Fallback...", err);
      
      // THE ULTIMATE FALLBACK: Free Public OCR API (Zero Config Required)
      try {
        const formData = new FormData();
        formData.append("base64Image", "data:image/jpeg;base64," + base64);
        formData.append("language", "eng");

        // Using helloworld public key for quick demo saves
        const ocrRes = await fetch("https://api.ocr.space/parse/image", {
          method: "POST",
          headers: { "apikey": "helloworld" },
          body: formData
        });
        
        const ocrData = await ocrRes.json();
        if (ocrData && !ocrData.IsErroredOnProcessing && ocrData.ParsedResults?.length > 0) {
          const extractedText = ocrData.ParsedResults[0].ParsedText;
          handleTextChange(extractedText);
          stopCamera();
        } else {
          throw new Error("OCR Fallback also failed");
        }
      } catch (fallbackErr) {
        alert("⚠️ Neural Bridge Busy: All Vision AI links are overwhelmed by hackathon traffic. Please type manually for this demo.");
      }
    } finally {
      setIsOcrProcessing(false);
    }
  };

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
      handleTextChange(transcript);
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
            <div className="relative group">
              <textarea
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Paste a news article, essay, or AI-generated content to verify..."
                className="w-full min-h-[160px] p-4 bg-elevated/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground resize-y font-sans text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                rows={6}
              />

              {suggestion && (
                <div className="absolute -top-3 left-4 animate-in slide-in-from-bottom-2 duration-300">
                  <button 
                    onClick={() => { setText(suggestion); setSuggestion(null); }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-accent text-accent-foreground text-[10px] font-bold rounded-full shadow-lg shadow-accent/20 hover:scale-105 transition-transform"
                  >
                    <span>💡 Did you mean:</span>
                    <span className="opacity-80 line-clamp-1 italic">"{suggestion.slice(0, 30)}..."</span>
                    <span className="flex items-center px-1 bg-white/20 rounded">Apply</span>
                  </button>
                </div>
              )}
              
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
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                          Upload
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                      
                      <button 
                        onClick={startCamera}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent/10 text-accent rounded-lg border border-accent/20 hover:bg-accent/20 transition-all text-xs font-semibold"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                        VeraScan
                      </button>

                      {localImage && (
                        <button 
                          onClick={() => { setLocalImage(null); setLocalImageBase64(null); }}
                          className="p-2 text-muted-foreground hover:text-destructive transition-colors bg-elevated rounded-lg border border-border"
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

      {/* SCANNER OVERLAY */}
      {isScanning && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
          <div className="relative w-full h-full max-w-lg md:h-[80vh] md:max-h-[800px] md:rounded-3xl overflow-hidden border-border/20 shadow-2xl">
            {capturedImageBase64 ? (
              <img src={capturedImageBase64} className="w-full h-full object-cover" alt="Captured" />
            ) : (
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            )}
            
            {!capturedImageBase64 && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-12">
                <div className="w-full max-w-[280px] h-[340px] border-2 border-primary/40 rounded-[2rem] relative">
                  <div className="absolute -inset-1 border border-primary/20 rounded-[2.2rem]" />
                  <div className="absolute inset-x-0 h-0.5 bg-primary/60 shadow-[0_0_20px_rgba(33,150,243,0.9)] animate-[scan_3s_linear_infinite]" />
                </div>
                <p className="text-white/80 text-[11px] font-bold uppercase tracking-[0.25em] bg-black/60 backdrop-blur-md px-5 py-2 rounded-full border border-white/10">Align text inside frame</p>
              </div>
            )}
            
            {isOcrProcessing && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-primary font-bold text-sm uppercase tracking-widest animate-pulse">Neural Extraction Active...</p>
              </div>
            )}

            <button 
              onClick={stopCamera}
              className="absolute top-6 right-6 p-3 bg-black/40 text-white rounded-full border border-white/20 hover:bg-black/60 transition-all active:scale-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          
          <div className="absolute bottom-10 left-0 right-0 px-6 flex flex-col gap-4 items-center">
            {capturedImageBase64 ? (
              <div className="flex gap-4 w-full max-w-md">
                <button 
                  onClick={() => setCapturedImageBase64(null)}
                  className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-all border border-white/10"
                >
                  Retake
                </button>
                <button 
                  onClick={analyzeOcr}
                  disabled={isOcrProcessing}
                  className="flex-[2] py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-[0_0_20px_rgba(33,150,243,0.4)] active:scale-[0.97] transition-all flex items-center justify-center gap-2"
                >
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  AI Analyze Text
                </button>
              </div>
            ) : (
              <>
                <button 
                  onClick={captureFrame}
                  className="w-20 h-20 bg-primary/20 p-2 rounded-full border-4 border-primary shadow-[0_0_30px_rgba(33,150,243,0.5)] active:scale-90 transition-all flex items-center justify-center group"
                >
                  <div className="w-full h-full bg-primary rounded-full group-hover:scale-95 transition-transform" />
                </button>
                <p className="text-white/40 text-[10px] font-medium uppercase tracking-widest">Tap to capture frame</p>
              </>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(340px); }
        }
      `}</style>

      {isDemoMode && (
        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full">
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
          Demo mode
        </div>
      )}
    </div>
  );
}
