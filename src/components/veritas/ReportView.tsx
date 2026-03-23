import { useState } from 'react';
import type { VerificationReport } from '@/types/verification';
import { MetricStrip } from './MetricStrip';
import { AIDetectionCard } from './AIDetectionCard';
import { AnnotatedText } from './AnnotatedText';
import { ClaimCard } from './ClaimCard';
import { ExportBar } from './ExportBar';
import { MediaAnalysis } from './MediaAnalysis';
import { CognitiveAnalysisCard } from './CognitiveAnalysisCard';

interface ReportViewProps {
  report: VerificationReport;
  onReset: () => void;
  onTranslate: (lang: string) => Promise<void>;
  isTranslating: boolean;
}

export function ReportView({ report, onReset, onTranslate, isTranslating }: ReportViewProps) {
  const [activeClaim, setActiveClaim] = useState<string | null>(null);

  const scrollToClaim = (claimId: string) => {
    setActiveClaim(claimId);
    document.getElementById(`claim-${claimId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => setActiveClaim(null), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <MetricStrip verifications={report.verifications} />

      {report.aiDetection && <AIDetectionCard detection={report.aiDetection} />}

      {report.cognitiveAnalysis && <CognitiveAnalysisCard analysis={report.cognitiveAnalysis} />}

      {report.imageAnalyses && report.imageAnalyses.length > 0 && (
        <MediaAnalysis analyses={report.imageAnalyses} />
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-5/12">
          <div className="lg:sticky lg:top-4">
            <AnnotatedText
              text={report.inputText}
              claims={report.claims}
              verifications={report.verifications}
              activeClaim={activeClaim}
              onClaimClick={scrollToClaim}
            />
          </div>
        </div>

        <div className="lg:w-7/12 space-y-4">
          {report.verifications.map((v, i) => (
            <ClaimCard
              key={v.claimId}
              verification={v}
              index={i}
              isActive={activeClaim === v.claimId}
            />
          ))}
        </div>
      </div>

      <ExportBar 
        report={report} 
        onReset={onReset} 
        onTranslate={onTranslate} 
        isTranslating={isTranslating} 
      />
    </div>
  );
}
