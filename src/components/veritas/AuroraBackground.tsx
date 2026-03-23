export function AuroraBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div
        className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px] animate-aurora"
        style={{ background: 'hsl(191, 100%, 50%, 0.2)' }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] animate-aurora"
        style={{ background: 'hsl(263, 84%, 58%, 0.15)', animationDelay: '-3s' }}
      />
    </div>
  );
}
