import { useState } from 'react';
import type { ClaimVerification } from '@/types/verification';
import { GlassCard } from '@/components/veritas/GlassCard';
import { WordPullUp } from '@/components/veritas/WordPullUp';

const VERDICT_CONFIG = {
  true: { label: 'True', badge: '✓', badgeClass: 'bg-success/20 text-success' },
  partially_true: { label: 'Partially True', badge: '~', badgeClass: 'bg-warning/20 text-warning' },
  false: { label: 'False', badge: '✗', badgeClass: 'bg-destructive/20 text-destructive' },
  unverifiable: { label: 'Unverifiable', badge: '?', badgeClass: 'bg-vneutral/20 text-vneutral' },
  conflicting: { label: 'Conflicting', badge: '⚡', badgeClass: 'bg-accent/20 text-accent' },
} as const;

const AUTHORITY_COLORS = {
  authoritative: 'text-success',
  credible: 'text-primary',
  unverified: 'text-muted-foreground',
} as const;

interface ClaimCardProps {
  verification: ClaimVerification;
  index: number;
  isActive: boolean;
}

export function ClaimCard({ verification, index, isActive }: ClaimCardProps) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  
  // SAFETY: Normalize verdict (API may return 'True' or 'true')
  const rawVerdict = (verification.verdict || 'unverifiable').toLowerCase().replace(' ', '_') as keyof typeof VERDICT_CONFIG;
  const config = VERDICT_CONFIG[rawVerdict] || VERDICT_CONFIG['unverifiable'];
  const isLowConfidence = (verification.confidence ?? 0) < 40 && rawVerdict === 'unverifiable';

  return (
    <GlassCard className={`verdict-${rawVerdict} animate-fade-up ${isActive ? 'ring-1 ring-primary/40 animate-highlight-pulse' : ''}`}>
      <div
        id={`claim-${verification.claimId}`}
        style={{ animationDelay: `${index * 80}ms` }}
      >
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <WordPullUp
              as="p"
              words={verification.claim?.text || ''}
              className="text-sm text-foreground leading-relaxed"
            />
            {verification.claim?.originalSpan && (
              <p className="text-xs text-muted-foreground mt-1 opacity-60 italic">
                Original: &ldquo;{verification.claim.originalSpan}&rdquo;
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
            {verification.claim.isTimeSensitive && (
              <span className="px-2 py-0.5 bg-warning/10 text-warning text-[10px] rounded-full">⏱ Time-sensitive</span>
            )}
            {verification.wasReviewed && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full">Reviewed</span>
            )}
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.badgeClass}`}>
              {config.badge} {config.label}
            </span>
          </div>
        </div>

        {/* Confidence */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-mono text-foreground">{verification.confidence}%</span>
          </div>
          <div className="h-2 bg-foreground/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full animate-bar-fill"
              style={{
                width: `${verification.confidence}%`,
                backgroundColor: verification.confidence >= 70 ? 'hsl(160,84%,39%)' :
                  verification.confidence >= 40 ? 'hsl(38,92%,50%)' : 'hsl(0,84%,60%)',
              }}
            />
          </div>
        </div>

        {isLowConfidence && (
          <div className="p-3 bg-warning/5 border border-warning/20 rounded-lg text-xs text-warning">
            ⚠ Low Confidence — This claim is too vague or general to verify against current sources.
          </div>
        )}

        {verification.claim.isTimeSensitive && (
          <p className="text-[11px] text-muted-foreground italic">
            ⏱ Time-sensitive claim — evidence reflects information available at time of search: {new Date().toISOString().split('T')[0]}
          </p>
        )}

        {/* Verdict-specific */}
        {verification.verdict === 'false' && verification.correction && (
          <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
            <p className="text-xs font-medium text-destructive mb-1">Correction</p>
            <p className="text-sm text-foreground/90">{verification.correction}</p>
          </div>
        )}

        {verification.verdict === 'partially_true' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {verification.accuratePart && (
              <div className="p-3 bg-success/5 border border-success/20 rounded-lg">
                <p className="text-xs font-medium text-success mb-1">Accurate Part</p>
                <p className="text-xs text-foreground/80">{verification.accuratePart}</p>
              </div>
            )}
            {verification.misleadingPart && (
              <div className="p-3 bg-warning/5 border border-warning/20 rounded-lg">
                <p className="text-xs font-medium text-warning mb-1">Misleading Part</p>
                <p className="text-xs text-foreground/80">{verification.misleadingPart}</p>
              </div>
            )}
          </div>
        )}

        {verification.verdict === 'conflicting' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-success/5 border border-success/20 rounded-lg">
              <p className="text-xs font-medium text-success mb-1">Supporting Evidence</p>
              <p className="text-xs text-foreground/80">{verification.conflictingSourcesSummary || 'See chain of thought for supporting sources.'}</p>
            </div>
            <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
              <p className="text-xs font-medium text-destructive mb-1">Contradicting Evidence</p>
              <p className="text-xs text-foreground/80">See chain of thought for contradicting sources.</p>
            </div>
          </div>
        )}

        {/* Self-reflection diff */}
        {verification.wasReviewed && verification.initialVerdict && verification.initialVerdict !== verification.verdict && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs">
            <span className="text-primary font-medium">Self-reflection update: </span>
            <span className="text-muted-foreground">
              Changed from {verification.initialVerdict} ({verification.initialConfidence}%) → {verification.verdict} ({verification.confidence}%)
            </span>
          </div>
        )}

        {/* Chain of Thought */}
        <div className="p-3 bg-foreground/[0.02] border border-foreground/5 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Chain of Thought</p>
          <p className="text-xs text-foreground/80 leading-relaxed">{verification.chainOfThought}</p>
          <p className="text-[10px] text-muted-foreground mt-2 italic">
            Evidence-grounded verdict — based on {verification.totalSourcesUsed} retrieved sources only.
          </p>
        </div>

        {/* Evidence Trail */}
        <div>
          <button
            onClick={() => setEvidenceOpen(!evidenceOpen)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors active:scale-[0.98]"
          >
            <span className="transition-transform duration-200" style={{ transform: evidenceOpen ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▶</span>
            Evidence Trail ({verification.totalSourcesRetrieved ?? 0} retrieved, {verification.totalSourcesUsed ?? 0} used)
          </button>

          {evidenceOpen && (
            <div className="mt-3 space-y-3 animate-fade-up">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground mb-1">Search Queries:</p>
                <div className="space-y-1">
                  {verification.searchQueries.map((q, i) => (
                    <p key={i} className="text-xs font-mono text-primary/70 bg-primary/5 px-2 py-1 rounded">🔍 {q}</p>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {verification.evidenceSources.map((source, i) => (
                  <div key={i} className="p-2.5 bg-foreground/[0.02] rounded-lg border border-foreground/5">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-medium uppercase ${AUTHORITY_COLORS[source.authorityLevel]}`}>
                          {source.authorityLevel}
                        </span>
                        {source.authorityScore && (
                          <div className="w-12 h-1 bg-foreground/10 rounded-full overflow-hidden group/tip relative">
                            <div 
                              className="h-full bg-primary" 
                              style={{ width: `${source.authorityScore}%` }} 
                            />
                          </div>
                        )}
                      </div>
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate">
                        {source.domain}
                      </a>
                      {source.publishedDate && <span className="text-[10px] text-muted-foreground">{source.publishedDate}</span>}
                    </div>
                    <p className="text-xs font-medium text-foreground/90 mb-0.5">{source.title}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-3">{source.snippet}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </GlassCard>
  );
}
