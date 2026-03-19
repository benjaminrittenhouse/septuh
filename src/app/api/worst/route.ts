import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

function getDb() {
  return new Database(path.join(process.cwd(), "septa.db"));
}

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(90, Math.max(1, parseInt(searchParams.get("days") ?? "7")));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "10")));
  const since = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

  const db = getDb();
  const rows = db.prepare(`
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
    LIMIT ?
  `).all(since, limit);
  db.close();
  return NextResponse.json(rows);
}
