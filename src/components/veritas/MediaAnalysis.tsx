import type { ImageAnalysis } from '@/types/verification';

export function MediaAnalysis({ analyses }: { analyses: ImageAnalysis[] }) {
  if (analyses.length === 0) return null;

  return (
    <div className="glass-card p-6 animate-fade-up">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Media Analysis</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {analyses.map((a, i) => (
          <div key={i} className="relative group rounded-lg overflow-hidden">
            <img src={a.imageUrl} alt="" className="w-full h-32 object-cover" loading="lazy" />
            <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-sm ${
              a.verdict === 'ai_generated' ? 'bg-destructive/80 text-foreground' :
              a.verdict === 'appears_authentic' ? 'bg-success/80 text-foreground' :
              a.verdict === 'likely_manipulated' ? 'bg-warning/80 text-foreground' :
              'bg-vneutral/80 text-foreground'
            }`}>
              {a.verdict === 'ai_generated' ? `AI ${a.confidence}%` :
               a.verdict === 'appears_authentic' ? `Auth. ${a.confidence}%` :
               `${a.confidence}%`}
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex flex-wrap gap-1">
                {a.indicators.slice(0, 3).map((ind, j) => (
                  <span key={j} className="text-[9px] bg-foreground/20 rounded px-1 text-foreground">{ind}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-4 italic">
        Audio deepfake detection: Submit audio file separately for analysis.
      </p>
    </div>
  );
}
