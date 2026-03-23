import type { VerificationReport } from '@/types/verification';
import { toast } from 'sonner';
import { ShinyButton } from '@/components/veritas/ShinyButton';

interface ExportBarProps {
  report: VerificationReport;
  onReset: () => void;
  onTranslate: (lang: string) => Promise<void>;
  isTranslating?: boolean;
}

export function ExportBar({ report, onReset, onTranslate, isTranslating }: ExportBarProps) {
  const exportPDF = () => window.print();

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veritas-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyShareLink = async () => {
    try {
      const state = btoa(unescape(encodeURIComponent(JSON.stringify(report))));
      const url = `${window.location.origin}?report=${encodeURIComponent(state)}`;
      await navigator.clipboard.writeText(url);
      toast.success('Share link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleTranslate = async (lang: string) => {
    try {
      await onTranslate(lang);
      toast.success(`Report translated to ${lang}`);
    } catch {
      toast.error('Translation failed');
    }
  };

  const btnClass = "px-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-foreground hover:bg-elevated active:scale-[0.97] transition-all";

  return (
    <div className="glass-card p-4 flex flex-wrap gap-3 justify-center no-print animate-fade-up">
      <div className="flex gap-2 mr-4 border-r border-border pr-4">
        <button onClick={() => handleTranslate('Hindi')} disabled={isTranslating} className="text-xs bg-surface border border-border px-3 py-1.5 rounded hover:bg-elevated">Translate (हिन्दी)</button>
        <button onClick={() => handleTranslate('Kannada')} disabled={isTranslating} className="text-xs bg-surface border border-border px-3 py-1.5 rounded hover:bg-elevated">Translate (ಕನ್ನಡ)</button>
      </div>
      <button onClick={exportPDF} className={btnClass}>Export PDF</button>
      <button onClick={exportJSON} className={btnClass}>Export JSON</button>
      <button onClick={copyShareLink} className={btnClass}>Copy Share Link</button>
      <ShinyButton onClick={onReset}>🔁 Re-analyze</ShinyButton>
    </div>
  );
}
