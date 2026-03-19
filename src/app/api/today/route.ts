import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

function getDb() {
  return new Database(path.join(process.cwd(), "septa.db"));
}

export function GET() {
  const db = getDb();
  const today = new Date().toISOString().split("T")[0];
  const rows = db.prepare(`
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
  `).all(today);
  db.close();
  return NextResponse.json(rows);
}
