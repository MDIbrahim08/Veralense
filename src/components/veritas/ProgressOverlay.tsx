import { useEffect, useRef } from 'react';
import type { PipelineStep, LogEntry, ExtractedClaim } from '@/types/verification';
import { WordPullUp } from '@/components/veritas/WordPullUp';

interface ProgressOverlayProps {
  steps: PipelineStep[];
  logs: LogEntry[];
  elapsedMs: number;
  claims: ExtractedClaim[];
}

export function ProgressOverlay({ steps, logs, elapsedMs, claims }: ProgressOverlayProps) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl">
        <div className="text-right mb-4">
          <span className="font-mono text-sm text-muted-foreground">⏱ {fmt(elapsedMs)}</span>
        </div>

        <div className="space-y-3 mb-6">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className={`glass-card p-4 flex items-center gap-4 transition-all ${
                step.status === 'active' ? 'border-primary/40 animate-glow' : ''
              } ${step.status === 'error' ? '!border-destructive/40' : ''}`}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                {step.status === 'pending' && <span className="text-muted-foreground/40 text-sm font-mono">{i + 1}</span>}
                {step.status === 'active' && <span className="w-3 h-3 rounded-full bg-primary animate-pulse" />}
                {step.status === 'complete' && <span className="text-success text-lg">✓</span>}
                {step.status === 'error' && <span className="text-destructive text-lg">✗</span>}
              </div>
              <div className="flex-1 min-w-0">
                <WordPullUp
                  as="p"
                  words={step.label}
                  className={`text-sm font-medium ${
                    step.status === 'active' ? 'text-foreground' :
                    step.status === 'complete' ? 'text-foreground/70' :
                    step.status === 'error' ? 'text-destructive' :
                    'text-muted-foreground/50'
                  }`}
                />
                <p className="text-xs text-muted-foreground truncate opacity-70">{step.detail || step.description}</p>
              </div>
              {step.status === 'complete' && step.startTime && step.endTime && (
                <span className="text-xs font-mono text-muted-foreground flex-shrink-0">{fmt(step.endTime - step.startTime)}</span>
              )}
            </div>
          ))}
        </div>

        {claims.length > 0 && (
          <div className="glass-card p-4 mb-6 animate-fade-up">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Extracted Claims ({claims.length})</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {claims.map((c, i) => (
                <div key={c.id} className="flex gap-2">
                  <span className="text-muted-foreground font-mono text-xs">{i + 1}.</span>
                  <WordPullUp
                    as="p"
                    words={c.text}
                    className="text-xs text-foreground/80 leading-relaxed"
                  />
                  {c.isTimeSensitive && <span className="text-warning text-[10px] self-start mt-0.5">⏱</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="glass-card overflow-hidden">
          <div className="px-4 py-2 border-b border-foreground/5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-muted-foreground font-mono">Live Log</span>
          </div>
          <div ref={logRef} className="h-44 overflow-y-auto p-3 log-console" style={{ background: 'rgba(0,0,0,0.4)' }}>
            {logs.map((log, i) => (
              <p
                key={i}
                className="text-xs font-mono leading-5"
                style={{
                  color: log.type === 'success' ? 'hsl(160, 84%, 50%)' :
                    log.type === 'error' ? 'hsl(0, 84%, 65%)' :
                    log.type === 'warning' ? 'hsl(38, 92%, 55%)' :
                    'hsl(160, 50%, 55%)',
                }}
              >
                <span className="opacity-40">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
              </p>
            ))}
            {logs.length === 0 && (
              <p className="text-xs font-mono text-muted-foreground/30">Waiting for pipeline to start...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
