export function ProgressBar({ preenchidos, total }: { preenchidos: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((preenchidos / total) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Progresso</span>
        <span>{preenchidos} / {total} · {pct}%</span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}