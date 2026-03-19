import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

function getDb() {
  return new Database(path.join(process.cwd(), "septa.db"));
}

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(365, Math.max(1, parseInt(searchParams.get("days") ?? "30")));
  const since = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

  const db = getDb();
  const rows = db.prepare(`
    SELECT
      date(captured_at) AS day,
      COUNT(*) AS total_observations,
      SUM(CASE WHEN late_min > 0 AND late_min < 999 THEN 1 ELSE 0 END) AS late_count,
      SUM(CASE WHEN late_min >= 999 THEN 1 ELSE 0 END) AS cancelled_count,
      ROUND(100.0 * SUM(CASE WHEN late_min > 0 AND late_min < 999 THEN 1 ELSE 0 END) / COUNT(*), 1) AS late_pct,
      ROUND(AVG(CASE WHEN late_min > 0 AND late_min < 999 THEN late_min END), 1) AS avg_late_min,
      MAX(CASE WHEN late_min < 999 THEN late_min ELSE 0 END) AS max_late_min
    FROM train_snapshots
    WHERE date(captured_at) >= ?
    GROUP BY day
    ORDER BY day
  `).all(since);
  db.close();
  return NextResponse.json(rows);
}
