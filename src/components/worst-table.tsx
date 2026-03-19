interface WorstRow {
  train_no: string;
  line: string;
  observations: number;
  times_late: number;
  times_cancelled: number;
  late_pct: number;
  worst_delay_min: number;
}

function ReliabilityBar({ pct }: { pct: number }) {
  const color = pct > 50 ? "bg-red-500" : pct > 25 ? "bg-amber-500" : "bg-emerald-500";
  const textColor = pct > 50 ? "text-red-600" : pct > 25 ? "text-amber-600" : "text-emerald-700";
  return (
    <div className="flex items-center gap-2 justify-end">
      <span className={`text-xs font-mono tabular-nums font-semibold w-16 text-right ${textColor}`}>
        {Math.round(pct)}% late
      </span>
      <div className="w-20 h-1.5 rounded-full bg-neutral-200 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function WorstTable({ data }: { data: WorstRow[] }) {
  if (!data.length) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm italic">
        Not enough data yet — run the collector for a few days.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-6 px-4 py-2 bg-[#1a1a1a] text-white text-[10px] font-bold uppercase tracking-[0.1em]">
        <span>Train</span>
        <span>Line</span>
        <span className="text-right">Worst Delay</span>
        <span className="text-right min-w-[148px]">Reliability</span>
      </div>

      {data.map((r, i) => (
        <div
          key={`${r.train_no}-${r.line}`}
          className={`grid grid-cols-[auto_1fr_auto_auto] gap-x-6 px-4 py-3 text-sm border-b border-border items-center
            ${i % 2 === 0 ? "bg-card" : "bg-neutral-50"}
            hover:bg-blue-50 transition-colors`}
        >
          <span className="font-mono font-bold text-[#0057a8] tabular-nums w-12">#{r.train_no}</span>
          <span className="text-muted-foreground">{r.line}</span>
          <span className="text-right font-mono tabular-nums text-amber-600 font-semibold">
            {r.worst_delay_min ? `+${r.worst_delay_min}m` : "—"}
          </span>
          <div className="text-right min-w-[148px]">
            <ReliabilityBar pct={r.late_pct} />
          </div>
        </div>
      ))}
    </div>
  );
}
