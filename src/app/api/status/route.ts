import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

function getDb() {
  return new Database(path.join(process.cwd(), "septa.db"));
}

export function GET() {
  const db = getDb();
  const row = db.prepare(`
    SELECT
      COUNT(*) AS total_rows,
      MIN(date(captured_at)) AS earliest,
      MAX(date(captured_at)) AS latest,
      COUNT(DISTINCT date(captured_at)) AS days_with_data
    FROM train_snapshots
  `).get() as { total_rows: number; earliest: string; latest: string; days_with_data: number };
  db.close();
  return NextResponse.json(row);
}
