import { StatCard } from "@/components/stat-card";
import { LinesTable } from "@/components/lines-table";
import { WorstTable } from "@/components/worst-table";
import { RailMap } from "@/components/rail-map";
import Database from "better-sqlite3";
import path from "path";

function getDb() {
  return new Database(path.join(process.cwd(), "septa.db"), { readonly: true });
}

interface TodayRow {
  hour_min: string;
  total: number;
  late_count: number;
  cancelled_count: number;
  avg_late_min: number | null;
  max_late_min: number;
}

interface LineRow {
  line: string;
  total: number;
  late_count: number;
  cancelled_count: number;
  late_pct: number;
  avg_late_min: number | null;
  max_late_min: number;
}

interface WorstRow {
  train_no: string;
  line: string;
  observations: number;
  times_late: number;
  times_cancelled: number;
  late_pct: number;
  worst_delay_min: number;
}

interface StatusRow {
  total_rows: number;
  earliest: string;
  latest: string;
  days_with_data: number;
}

export default function DashboardPage() {
  let todayData: TodayRow[] = [];
  let linesData: LineRow[] = [];
  let worstData: WorstRow[] = [];
  let status: StatusRow = { total_rows: 0, earliest: "", latest: "", days_with_data: 0 };

  try {
    const db = getDb();
    const today = new Date().toISOString().split("T")[0];
    const since7 = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    todayData = db.prepare(`
      SELECT
        strftime('%H:%M', captured_at) AS hour_min,
        COUNT(*) AS total,
        SUM(CASE WHEN late_min > 0 AND late_min < 999 THEN 1 ELSE 0 END) AS late_count,
        SUM(CASE WHEN late_min >= 999 THEN 1 ELSE 0 END) AS cancelled_count,
        ROUND(AVG(CASE WHEN late_min > 0 AND late_min < 999 THEN late_min END), 1) AS avg_late_min,
        MAX(CASE WHEN late_min < 999 THEN late_min ELSE 0 END) AS max_late_min
      FROM train_snapshots
      WHERE date(captured_at) = ?
      GROUP BY hour_min
      ORDER BY hour_min
    `).all(today) as TodayRow[];

    linesData = db.prepare(`
      SELECT
        COALESCE(line, 'Unknown') AS line,
        COUNT(*) AS total,
        SUM(CASE WHEN late_min > 0 AND late_min < 999 THEN 1 ELSE 0 END) AS late_count,
        SUM(CASE WHEN late_min >= 999 THEN 1 ELSE 0 END) AS cancelled_count,
        ROUND(100.0 * SUM(CASE WHEN late_min > 0 AND late_min < 999 THEN 1 ELSE 0 END) / COUNT(*), 1) AS late_pct,
        ROUND(AVG(CASE WHEN late_min > 0 AND late_min < 999 THEN late_min END), 1) AS avg_late_min,
        MAX(CASE WHEN late_min < 999 THEN late_min ELSE 0 END) AS max_late_min
      FROM train_snapshots
      WHERE date(captured_at) = ?
      GROUP BY line
      ORDER BY late_pct DESC
    `).all(today) as LineRow[];

    worstData = db.prepare(`
      SELECT
        COALESCE(train_no, 'Unknown') AS train_no,
        COALESCE(line, 'Unknown') AS line,
        COUNT(*) AS observations,
        SUM(CASE WHEN late_min > 0 AND late_min < 999 THEN 1 ELSE 0 END) AS times_late,
        SUM(CASE WHEN late_min >= 999 THEN 1 ELSE 0 END) AS times_cancelled,
        ROUND(100.0 * SUM(CASE WHEN late_min > 0 AND late_min < 999 THEN 1 ELSE 0 END) / COUNT(*), 1) AS late_pct,
        MAX(CASE WHEN late_min < 999 THEN late_min ELSE 0 END) AS worst_delay_min
      FROM train_snapshots
      WHERE date(captured_at) >= ?
      GROUP BY train_no, line
      HAVING observations >= 3
      ORDER BY late_pct DESC, worst_delay_min DESC
      LIMIT 10
    `).all(since7) as WorstRow[];

    status = db.prepare(`
      SELECT
        COUNT(*) AS total_rows,
        MIN(date(captured_at)) AS earliest,
        MAX(date(captured_at)) AS latest,
        COUNT(DISTINCT date(captured_at)) AS days_with_data
      FROM train_snapshots
    `).get() as StatusRow;

    db.close();
  } catch {
    // DB not yet available
  }

  const total     = todayData.reduce((s, r) => s + r.total, 0);
  const late      = todayData.reduce((s, r) => s + r.late_count, 0);
  const cancelled = todayData.reduce((s, r) => s + (r.cancelled_count || 0), 0);
  const ontime    = total > 0 ? (((total - late - cancelled) / total) * 100).toFixed(1) : "—";
  const avgArr    = todayData.filter((r) => r.avg_late_min).map((r) => r.avg_late_min as number);
  const avg       = avgArr.length ? Math.round(avgArr.reduce((a, b) => a + b, 0) / avgArr.length).toString() : "—";
  const worst     = Math.max(...todayData.map((r) => r.max_late_min || 0), 0);

  const now = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });

  return (
    <div className="min-h-screen bg-background">

      {/* Header — black nav bar matching SEPTA.org */}
      <header className="bg-[#1a1a1a] px-6 py-0 flex items-center gap-6 h-14">
        {/* Logo mark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#0057a8] rounded-sm flex items-center justify-center shrink-0">
            <span className="text-white font-black text-[9px] leading-none text-center tracking-tight">
              SE<br />PT<br />A
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-white font-black text-lg tracking-tight">septuh</span>
            <span className="text-neutral-400 text-xs hidden sm:inline">Regional Rail Delay Tracker</span>
          </div>
        </div>

        {/* Datetime + status */}
        <div className="ml-auto flex items-center gap-6">
          <div className="hidden sm:block text-right">
            <div className="text-white font-mono font-semibold text-sm tabular-nums">{now}</div>
            <div className="text-neutral-400 text-xs">{today}</div>
          </div>
          {status.total_rows > 0 && (
            <div className="text-right shrink-0">
              <div className="text-white text-xs font-semibold">{status.total_rows.toLocaleString()} records</div>
              <div className="text-neutral-400 text-xs">{status.days_with_data} day{status.days_with_data !== 1 ? "s" : ""} of data</div>
            </div>
          )}
        </div>
      </header>

      {/* SEPTA blue underline accent */}
      <div className="h-1 w-full bg-[#0057a8]" />

      <main className="max-w-7xl mx-auto p-6 space-y-8">

        {/* Stat cards */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3 flex items-center gap-2">
            <span className="inline-block w-3 h-[2px] bg-[#0057a8]" />
            Today&apos;s Service Snapshot
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Trains Observed" value={total || "—"} sub="snapshots today" variant="blue" />
            <StatCard label="Running Late"    value={late || "—"}  sub="behind schedule"  variant="yellow" />
            <StatCard label="Cancelled"       value={cancelled || "—"} sub="out of service" variant="red" />
            <StatCard label="On-Time Rate"    value={ontime !== "—" ? `${ontime}%` : "—"} sub="of all observed" variant="green" />
            <StatCard label="Avg Delay"       value={avg !== "—" ? `${avg}m` : "—"} sub="late trains only" variant="yellow" />
            <StatCard label="Worst Delay"     value={worst > 0 ? `+${worst}m` : "—"} sub="most minutes late" variant="red" />
          </div>
        </section>

        {/* Rail map */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3 flex items-center gap-2">
            <span className="inline-block w-3 h-[2px] bg-[#0057a8]" />
            Regional Rail Map — Hover a Line
          </h2>
          <RailMap data={linesData} />
        </section>

        {/* Line status + worst offenders side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3 flex items-center gap-2">
              <span className="inline-block w-3 h-[2px] bg-[#0057a8]" />
              Today — Service Status by Line
            </h2>
            <div className="border border-border rounded-sm overflow-hidden">
              <LinesTable data={linesData} />
            </div>
          </section>

          <section>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3 flex items-center gap-2">
              <span className="inline-block w-3 h-px bg-[#e8192c]" />
              Worst Offenders — Past 7 Days
            </h2>
            <div className="border border-border rounded-sm overflow-hidden">
              <WorstTable data={worstData} />
            </div>
          </section>
        </div>

      </main>

      <footer className="border-t border-border mt-8 px-6 py-4 text-center text-xs text-muted-foreground">
        Data sourced from the{" "}
        <span className="text-primary">SEPTA TrainView API</span>
        {" "}· Refreshes every 5 minutes via collector
      </footer>
    </div>
  );
}
