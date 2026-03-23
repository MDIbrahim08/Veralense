import type { ImageAnalysis, AudioAnalysis } from '@/types/verification';

export function MediaAnalysis({ 
  analyses = [], 
  audioAnalyses = [] 
}: { 
  analyses?: ImageAnalysis[],
  audioAnalyses?: AudioAnalysis[]
}) {
  if (analyses.length === 0 && audioAnalyses.length === 0) return null;

  return (
    <div className="glass-card p-6 animate-fade-up space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Media Verification Center</h3>
        <div className="flex gap-2 text-[10px] font-bold">
          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">AGENTIC SCAN ACTIVE</span>
        </div>
      </div>

      {analyses.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {analyses.map((a, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-border/50">
              <img src={a.imageUrl} alt="" className="w-full h-32 object-cover" loading="lazy" />
              <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md border border-white/10 ${
                a.verdict === 'ai_generated' ? 'bg-destructive/80 text-white' :
                'bg-success/80 text-white'
              }`}>
                {a.verdict === 'ai_generated' ? `AI ${a.confidence}%` : `AUTH. ${a.confidence}%`}
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="text-[9px] text-white/70 font-medium">Image Forensic Analysis</p>
                <div className="flex flex-wrap gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {a.indicators.slice(0, 2).map((ind, j) => (
                    <span key={j} className="text-[8px] bg-white/20 rounded px-1 text-white">{ind}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {audioAnalyses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border/10 pt-4">
          {audioAnalyses.map((aa, i) => (
            <div key={i} className="flex gap-4 p-3 bg-elevated/40 rounded-xl border border-border/50 group relative overflow-hidden">
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-primary/10 rounded-full text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-foreground">Synthetic Voice Forensics</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    aa.verdict === 'ai_generated' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
                  }`}>
                    {aa.verdict === 'ai_generated' ? 'AI SYNTHETIC' : 'AUTHENTIC'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {aa.indicators.map((ind, j) => (
                    <span key={j} className="text-[9px] text-muted-foreground bg-surface px-1.5 py-0.5 rounded border border-border/30">{ind}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <p className="text-[10px] text-muted-foreground mt-2 italic flex items-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12" y1="8" y2="8"/></svg>
        Multi-modal media verification results are based on neural fingerprinting.
      </p>
    </div>
  );
}
