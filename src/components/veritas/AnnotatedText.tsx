import { useMemo } from 'react';
import type { ExtractedClaim, ClaimVerification, Verdict } from '@/types/verification';

const VERDICT_UNDERLINE: Record<Verdict, string> = {
  true: 'decoration-[hsl(160,84%,39%)]',
  partially_true: 'decoration-[hsl(38,92%,50%)]',
  false: 'decoration-[hsl(0,84%,60%)]',
  unverifiable: 'decoration-[hsl(220,9%,46%)]',
  conflicting: 'decoration-[hsl(263,84%,58%)]',
};

interface AnnotatedTextProps {
  text: string;
  claims: ExtractedClaim[];
  verifications: ClaimVerification[];
  activeClaim: string | null;
  onClaimClick: (claimId: string) => void;
}

export function AnnotatedText({ text, claims, verifications, activeClaim, onClaimClick }: AnnotatedTextProps) {
  const segments = useMemo(() => {
    const positions: { start: number; end: number; claim: ExtractedClaim; verification?: ClaimVerification }[] = [];

    for (const claim of claims) {
      const idx = text.indexOf(claim.originalSpan);
      if (idx !== -1) {
        const v = verifications.find(v => v.claimId === claim.id);
        positions.push({ start: idx, end: idx + claim.originalSpan.length, claim, verification: v });
      }
    }

    positions.sort((a, b) => a.start - b.start);

    const result: { text: string; claim?: ExtractedClaim; verification?: ClaimVerification }[] = [];
    let lastEnd = 0;

    for (const pos of positions) {
      if (pos.start > lastEnd) result.push({ text: text.slice(lastEnd, pos.start) });
      if (pos.start >= lastEnd) {
        result.push({ text: text.slice(pos.start, pos.end), claim: pos.claim, verification: pos.verification });
        lastEnd = pos.end;
      }
    }

    if (lastEnd < text.length) result.push({ text: text.slice(lastEnd) });
    return result;
  }, [text, claims, verifications]);

  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Original Text</h3>
      <div className="text-sm leading-7 text-foreground/90" style={{ overflowWrap: 'break-word' }}>
        {segments.map((seg, i) =>
          seg.claim ? (
            <span
              key={i}
              onClick={() => onClaimClick(seg.claim!.id)}
              className={`cursor-pointer underline underline-offset-4 decoration-2 transition-all hover:bg-foreground/5 rounded px-0.5 ${
                seg.verification ? VERDICT_UNDERLINE[seg.verification.verdict] : 'decoration-muted-foreground/30'
              } ${activeClaim === seg.claim.id ? 'bg-foreground/10 animate-highlight-pulse' : ''}`}
              title={seg.verification ? `${seg.verification.verdict.replace('_', ' ')} (${seg.verification.confidence}%)` : 'Pending'}
            >
              {seg.text}
            </span>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </div>
    </div>
  );
}
