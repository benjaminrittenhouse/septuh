/**
 * SEPTA train delay collector (TypeScript)
 * Polls the SEPTA TrainView API every 5 minutes and stores data to SQLite.
 *
 * Usage:
 *   npx tsx collector.ts          # run continuously
 *   npx tsx collector.ts --once   # single fetch and exit
 */

import Database from "better-sqlite3";
import cron from "node-cron";
import path from "path";

const SEPTA_URL = "https://www3.septa.org/api/TrainView/index.php";
const DB_PATH = path.join(process.cwd(), "septa.db");

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS train_snapshots (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      captured_at TEXT    NOT NULL,
      train_no    TEXT,
      line        TEXT,
      origin      TEXT,
      destination TEXT,
      late_min    INTEGER NOT NULL DEFAULT 0,
      status      TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_captured_at ON train_snapshots(captured_at);
  `);
}

interface SeptaTrain {
  trainno?: string;
  train_no?: string;
  line?: string;
  SOURCE?: string;
  dest?: string;
  late?: string | number;
}

async function fetchTrains(): Promise<SeptaTrain[]> {
  const res = await fetch(SEPTA_URL, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function collectOnce(db: Database.Database) {
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  fetchTrains()
    .then((trains) => {
      const insert = db.prepare(
        `INSERT INTO train_snapshots (captured_at, train_no, line, origin, destination, late_min, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );

      const insertMany = db.transaction((trains: SeptaTrain[]) => {
        let lateCount = 0;
        for (const t of trains) {
          const late = Math.max(0, parseInt(String(t.late ?? "0")) || 0);
          const status = late >= 999 ? "cancelled" : late > 0 ? "late" : "on_time";
          if (late > 0 && late < 999) lateCount++;
          insert.run(
            now,
            t.trainno ?? t.train_no ?? null,
            t.line ?? null,
            t.SOURCE ?? null,
            t.dest ?? null,
            late,
            status
          );
        }
        return lateCount;
      });

      const lateCount = insertMany(trains);
      console.log(`[${now}] Captured ${trains.length} trains (${lateCount} late)`);
    })
    .catch((err) => {
      console.error(`[${now}] Failed to fetch SEPTA data:`, err.message);
    });
}

const args = process.argv.slice(2);
const db = new Database(DB_PATH);
initDb(db);

if (args.includes("--once")) {
  collectOnce(db);
} else {
  console.log("Starting collector — polling every 5 minutes.");
  collectOnce(db);
  cron.schedule("*/5 * * * *", () => collectOnce(db));
}
