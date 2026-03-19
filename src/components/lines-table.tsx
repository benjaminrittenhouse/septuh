interface LineRow {
  line: string;
  total: number;
  late_count: number;
  cancelled_count: number;
  late_pct: number;
  avg_late_min: number | null;
  max_late_min: number;
}

function StatusDot({ pct, cancelled }: { pct: number; cancelled: number }) {
  if (cancelled > 0)
    return <span className="inline-flex items-center gap-1.5 text-red-600 font-bold text-xs"><span className="w-2 h-2 rounded-full bg-red-500 inline-block shrink-0" />DISRUPTED</span>;
  if (pct > 30)
    return <span className="inline-flex items-center gap-1.5 text-amber-700 font-bold text-xs"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block shrink-0" />DELAYS</span>;
  if (pct > 5)
    return <span className="inline-flex items-center gap-1.5 text-amber-600 font-bold text-xs"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block shrink-0" />MINOR DELAYS</span>;
  return <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-xs"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />ON TIME</span>;
}

export function LinesTable({ data }: { data: LineRow[] }) {
  if (!data.length) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm italic">
        No service data yet today.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-[1fr_64px_52px_72px_72px_110px] px-4 py-2 bg-[#1a1a1a] text-white text-[10px] font-bold uppercase tracking-[0.1em]">
        <span>Line</span>
        <span className="text-right">Observed</span>
        <span className="text-right">Late</span>
        <span className="text-right">Cancelled</span>
        <span className="text-right">Avg Delay</span>
        <span className="text-right">Status</span>
      </div>

      {data.map((r, i) => (
        <div
          key={r.line}
          className={`grid grid-cols-[1fr_64px_52px_72px_72px_110px] px-4 py-3 text-sm border-b border-border items-center
            ${i % 2 === 0 ? "bg-card" : "bg-neutral-50"}
            hover:bg-blue-50 transition-colors`}
        >
          <span className="font-semibold text-foreground">{r.line}</span>
          <span className="text-right text-muted-foreground font-mono tabular-nums">{r.total}</span>
          <span className={`text-right font-mono tabular-nums font-semibold ${r.late_count > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
            {r.late_count || "—"}
          </span>
          <span className={`text-right font-mono tabular-nums font-semibold ${r.cancelled_count > 0 ? "text-red-600" : "text-muted-foreground"}`}>
            {r.cancelled_count || "—"}
          </span>
          <span className="text-right font-mono tabular-nums text-muted-foreground">
            {r.avg_late_min ? `${Math.round(r.avg_late_min)}m` : "—"}
          </span>
          <div className="text-right">
            <StatusDot pct={r.late_pct} cancelled={r.cancelled_count} />
          </div>
        </div>
      ))}
    </div>
  );
}
