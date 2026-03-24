import { useState, Component, type ReactNode } from 'react';
import { BackgroundPaths } from '@/components/veritas/BackgroundPaths';
import { GradualSpacing } from '@/components/veritas/GradualSpacing';
import { InputPanel } from '@/components/veritas/InputPanel';
import { ProgressOverlay } from '@/components/veritas/ProgressOverlay';
import { ReportView } from '@/components/veritas/ReportView';
import { ShinyButton } from '@/components/veritas/ShinyButton';
import { TextLoop } from '@/components/veritas/TextLoop';
import { LampContainer } from '@/components/veritas/LampEffect';
import { useVerificationPipeline } from '@/hooks/useVerificationPipeline';

// ─── CRASH SHIELD: Catches any rendering error before it goes black ───────────
class ErrorBoundary extends Component<{ children: ReactNode; onReset?: () => void }, { hasError: boolean; errorMsg: string }> {
  constructor(props: any) { super(props); this.state = { hasError: false, errorMsg: '' }; }
  static getDerivedStateFromError(err: any) { return { hasError: true, errorMsg: err?.message || 'Unknown error' }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-card p-8 max-w-lg mx-auto text-center mt-10 animate-fade-up">
          <p className="text-destructive text-sm font-medium mb-2">Display Error Detected</p>
          <p className="text-xs text-muted-foreground mb-6">{this.state.errorMsg}</p>
          <ShinyButton onClick={() => { this.setState({ hasError: false }); this.props.onReset?.(); }}>
            ↩ Start New Analysis
          </ShinyButton>
        </div>
      );
    }
    return this.props.children;
  }
}
// ─────────────────────────────────────────────────────────────────────────────


export default function Index() {
  const { state, steps, logs, report, claims, elapsedMs, run, reset, fetchUrl, translateReport } = useVerificationPipeline();
  const [isTranslating, setIsTranslating] = useState(false);

  const isIdle = state === 'idle';

  const handleTranslate = async (lang: string) => {
    if (!report) return;
    setIsTranslating(true);
    try {
      await translateReport(report, lang);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-background">
      {/* Full-page animated background — always present */}
      <BackgroundPaths />

      <div className="relative z-10">
        {/* Hero header — only shown on idle state */}
        {isIdle && (
          <header className="relative w-full min-h-[900px] overflow-hidden border-b border-border/10">
            <LampContainer>
              <div className="flex flex-col items-center text-center gap-6 mt-32">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(33,150,243,0.3)]">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  Intelligence Truth Layer
                </div>


                <GradualSpacing
                  text="VeraLens"
                  className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground"
                />

                <p className="text-muted-foreground/60 text-sm md:text-base font-medium max-w-xl">
                  A Cognitive Proofing &amp; Fact-Verification Engine —{' '}
                  <TextLoop
                    interval={2.5}
                    className="text-primary font-semibold"
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                  >
                    <span>Multi-agent AI claim extraction</span>
                    <span>Real-time web evidence retrieval</span>
                    <span>Deepfake &amp; AI media detection</span>
                    <span>True / False / Partially True verdicts</span>
                    <span>Multilingual voice input support</span>
                  </TextLoop>
                </p>
              </div>
            </LampContainer>

            {/* Bottom fade into InputPanel */}
            <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-10" />
          </header>
        )}

        {/* Compact nav bar shown when not idle */}
        {!isIdle && (
          <div className="sticky top-0 z-50 w-full border-b border-border/10 bg-background/80 backdrop-blur-md px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="VeraLens" className="w-8 h-8 rounded-lg object-cover" />
              <span className="text-lg font-bold tracking-tight text-foreground">VeraLens</span>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-bold text-primary uppercase tracking-widest">
                {state === 'running' ? 'Analyzing…' : 'Results'}
              </span>
            </div>
            <ShinyButton onClick={reset} className="text-xs py-1 px-3">↩ New Analysis</ShinyButton>
          </div>
        )}

        {/* Main content */}
        <main className={`px-4 pb-16 relative z-20 max-w-5xl mx-auto ${isIdle ? '-mt-24' : 'pt-10'}`}>
          {isIdle && (
            <InputPanel onSubmit={run} onFetchUrl={fetchUrl} isLoading={false} />
          )}

          {state === 'running' && (
            <ProgressOverlay steps={steps} logs={logs} elapsedMs={elapsedMs} claims={claims} />
          )}

          {(state === 'complete' || state === 'error') && report && (
            <ErrorBoundary onReset={reset}>
              <ReportView 
                report={report} 
                onReset={reset} 
                onTranslate={handleTranslate} 
                isTranslating={isTranslating} 
              />
            </ErrorBoundary>
          )}

          {state === 'error' && !report && (
            <div className="max-w-lg mx-auto text-center animate-fade-up mt-20">
              <div className="glass-card p-8">
                <p className="text-destructive text-sm mb-6">Pipeline encountered an error. Please try again.</p>
                <ShinyButton onClick={reset}>↩ Try Again</ShinyButton>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
