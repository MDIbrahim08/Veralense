import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { ClaimVerification } from '@/types/verification';

function MetricCard({ label, value, colorClass }: { label: string; value: string | number; colorClass?: string }) {
  return (
    <div className="glass-card p-4 flex flex-col items-center justify-center text-center">
      <span className={`text-2xl font-bold font-mono ${colorClass || 'text-foreground'}`}>{value}</span>
      <span className="text-[11px] text-muted-foreground mt-1">{label}</span>
    </div>
  );
}

export function MetricStrip({ verifications }: { verifications: ClaimVerification[] }) {
  const counts = {
    true: verifications.filter(v => v.verdict === 'true').length,
    partial: verifications.filter(v => v.verdict === 'partially_true').length,
    false: verifications.filter(v => v.verdict === 'false').length,
    unverifiable: verifications.filter(v => v.verdict === 'unverifiable').length,
    conflicting: verifications.filter(v => v.verdict === 'conflicting').length,
  };
  const total = verifications.length;
  const pct = total > 0 ? Math.round(((counts.true + counts.partial * 0.5) / total) * 100) : 0;

  const data = [
    { name: 'True', value: counts.true, color: 'hsl(160,84%,39%)' },
    { name: 'Partial', value: counts.partial, color: 'hsl(38,92%,50%)' },
    { name: 'False', value: counts.false, color: 'hsl(0,84%,60%)' },
    { name: 'Unverifiable', value: counts.unverifiable, color: 'hsl(220,9%,46%)' },
    { name: 'Conflicting', value: counts.conflicting, color: 'hsl(263,84%,58%)' },
  ].filter(d => d.value > 0);

  const parts: string[] = [];
  const supported = counts.true + counts.partial;
  if (supported > 0) parts.push(`${supported} of ${total} claims are supported by evidence`);
  if (counts.false > 0) parts.push(`${counts.false} ${counts.false === 1 ? 'is' : 'are'} false`);
  if (counts.unverifiable > 0) parts.push(`${counts.unverifiable} could not be verified`);
  if (counts.conflicting > 0) parts.push(`${counts.conflicting} ${counts.conflicting === 1 ? 'has' : 'have'} conflicting evidence`);

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="glass-card p-4 flex flex-col items-center col-span-2 sm:col-span-1">
          <div className="w-20 h-20">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.length > 0 ? data : [{ value: 1, color: 'hsl(220,9%,20%)' }]} cx="50%" cy="50%" innerRadius={24} outerRadius={34} dataKey="value" startAngle={90} endAngle={-270} stroke="none">
                  {(data.length > 0 ? data : [{ value: 1, color: 'hsl(220,9%,20%)' }]).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <span className="text-2xl font-bold font-mono text-foreground">{pct}%</span>
          <span className="text-[11px] text-muted-foreground">Overall Score</span>
        </div>
        <MetricCard label="Total Claims" value={total} />
        <MetricCard label="True" value={counts.true} colorClass="text-success" />
        <MetricCard label="Partially True" value={counts.partial} colorClass="text-warning" />
        <MetricCard label="False / Unverifiable" value={`${counts.false} / ${counts.unverifiable}`} colorClass="text-destructive" />
      </div>
      <p className="text-sm text-muted-foreground text-center">{parts.join('. ')}{parts.length > 0 ? '.' : 'No claims analyzed.'}</p>
    </div>
  );
}
