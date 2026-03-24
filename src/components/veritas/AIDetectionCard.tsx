import type { AIDetectionResult } from '@/types/verification';
import { GlassCard } from '@/components/veritas/GlassCard';
import { WordPullUp } from '@/components/veritas/WordPullUp';

const INDICATOR_LABELS: { key: keyof AIDetectionResult['indicators']; label: string }[] = [
  { key: 'vocabularyEntropy', label: 'Vocabulary Entropy' },
  { key: 'sentenceLengthUniformity', label: 'Sentence Length Uniformity' },
  { key: 'hedgingLanguage', label: 'Hedging Language Density' },
  { key: 'structuralRepetition', label: 'Structural Repetition' },
  { key: 'perplexityEstimate', label: 'Perplexity Estimate' },
];

export function AIDetectionCard({ detection }: { detection: AIDetectionResult }) {
  const { 
    overallProbability = 0, 
    indicators = {} as any, 
    verdict = 'uncertain', 
    explanation = "" 
  } = detection;
  
  // Safe defaults for indicators to prevent 'undefined' crashes
  const safeIndicators = {
    vocabularyEntropy: indicators?.vocabularyEntropy ?? 0,
    sentenceLengthUniformity: indicators?.sentenceLengthUniformity ?? 0,
    hedgingLanguage: indicators?.hedgingLanguage ?? 0,
    structuralRepetition: indicators?.structuralRepetition ?? 0,
    perplexityEstimate: indicators?.perplexityEstimate ?? 0,
  };
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (overallProbability / 100) * circumference;

  const verdictLabel = { likely_ai: 'Likely AI-Generated', uncertain: 'Uncertain', likely_human: 'Likely Human-Written' }[verdict];
  const verdictColor = { likely_ai: 'text-destructive', uncertain: 'text-warning', likely_human: 'text-success' }[verdict];
  const strokeColor = overallProbability > 70 ? 'hsl(0,84%,60%)' : overallProbability > 40 ? 'hsl(38,92%,50%)' : 'hsl(160,84%,39%)';

  return (
    <GlassCard className="animate-fade-up">
      <div className="p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">AI Content Analysis</h3>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke={strokeColor}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold font-mono text-foreground">{overallProbability}%</span>
            <span className="text-[9px] text-muted-foreground">AI Prob.</span>
          </div>
        </div>

        <div className="flex-1 space-y-3 w-full">
          <WordPullUp
            as="p"
            words={verdictLabel}
            className={`text-sm font-semibold ${verdictColor}`}
          />
          <div className="space-y-2">
            {INDICATOR_LABELS.map(({ key, label }) => {
              const val = safeIndicators[key as keyof typeof safeIndicators];
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono text-foreground">{val}</span>
                  </div>
                  <div className="h-1.5 bg-foreground/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full animate-bar-fill"
                      style={{
                        width: `${val}%`,
                        backgroundColor: val > 70 ? 'hsl(0,84%,60%)' : val > 40 ? 'hsl(38,92%,50%)' : 'hsl(160,84%,39%)',
                      }}
                    />
                  </div>
                </div>
          );
          })}
        </div>
        <WordPullUp
          as="p"
          words={explanation}
          className="text-xs text-muted-foreground leading-relaxed"
        />
      </div>
      </div>
      </div>
    </GlassCard>
  );
}
