import { CognitiveAnalysis } from '@/types/verification';
import { motion } from 'framer-motion';
import { Info, Gauge, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CognitiveAnalysisCardProps {
  analysis: CognitiveAnalysis;
}

export function CognitiveAnalysisCard({ analysis }: CognitiveAnalysisCardProps) {
  // SAFETY: Bail out if analysis or its required sub-objects are missing/malformed
  if (!analysis || !analysis.bias || !analysis.sentiment) return null;

  const biasLabel = analysis.bias?.label || 'neutral';
  const sentimentLabel = analysis.sentiment?.label || 'neutral';
  const sentimentScore = analysis.sentiment?.score ?? 50;
  const biasCertainty = analysis.bias?.certainty ?? 50;

  const getBiasConfig = (label: string) => {
    switch (label) {
      case 'left': return { color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Left Wing' };
      case 'center-left': return { color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Center Left' };
      case 'center-right': return { color: 'text-red-400', bg: 'bg-red-400/10', label: 'Center Right' };
      case 'right': return { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Right Wing' };
      default: return { color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'Neutral / Balanced' };
    }
  };

  const getSentimentIcon = (label: string) => {
    switch (label) {
      case 'hostile': return <AlertCircle className="w-5 h-5 text-destructive" />;
      case 'negative': return <TrendingDown className="w-5 h-5 text-orange-400" />;
      case 'positive': return <TrendingUp className="w-5 h-5 text-emerald-400" />;
      case 'optimistic': return <TrendingUp className="w-5 h-5 text-primary" />;
      default: return <Minus className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const biasConfig = getBiasConfig(biasLabel);

  const biasPosition = biasLabel === 'left' ? '10%' :
    biasLabel === 'center-left' ? '30%' :
    biasLabel === 'center-right' ? '70%' :
    biasLabel === 'right' ? '90%' : '50%';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Gauge className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Cognitive Insights</h3>
              <p className="text-xs text-muted-foreground">Detection of framing, sentiment, and ideological lean</p>
            </div>
          </div>
          <div className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", biasConfig.bg, biasConfig.color)}>
            {biasConfig.label}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sentiment Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
              <span>Sentiment Profile</span>
            </div>
            <div className="p-4 bg-elevated/50 border border-border rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize flex items-center gap-2">
                  {getSentimentIcon(sentimentLabel)}
                  {sentimentLabel}
                </span>
                <span className="text-xl font-bold text-foreground">{sentimentScore}%</span>
              </div>
              <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${sentimentScore}%` }}
                  className="h-full bg-primary"
                />
              </div>
              {analysis.sentiment.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {analysis.sentiment.description}
                </p>
              )}
            </div>
          </div>

          {/* Bias Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
              <span>Ideological Framing</span>
            </div>
            <div className="p-4 bg-elevated/50 border border-border rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className={cn("text-sm font-bold capitalize", biasConfig.color)}>
                  {biasLabel.replace('-', ' ')}
                </span>
                <span className="text-xs font-medium text-muted-foreground">Certainty: {biasCertainty}%</span>
              </div>
              <div className="relative h-1 w-full bg-border rounded-full">
                <div className="absolute left-1/2 -ml-[1px] h-full w-[2px] bg-muted-foreground/30 z-10" />
                <motion.div 
                  initial={{ left: "50%" }}
                  animate={{ left: biasPosition }}
                  className={cn("absolute -top-1 w-3 h-3 rounded-full border-2 border-surface shadow-lg z-20", 
                    biasLabel.includes('left') ? 'bg-blue-500' : 
                    biasLabel.includes('right') ? 'bg-red-500' : 'bg-emerald-500'
                  )}
                />
              </div>
              {analysis.bias.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {analysis.bias.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Narrative Analysis */}
        {analysis.narrativeAnalysis && (
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-primary/5 rounded-md mt-0.5">
                <Info className="w-4 h-4 text-primary/70" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Narrative Conclusion</span>
                <p className="text-sm text-foreground/80 leading-relaxed italic">
                  "{analysis.narrativeAnalysis}"
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
