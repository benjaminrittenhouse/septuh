import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { trainSnapshots } from "./schema";
import path from "path";

const DB_PATH = path.join(process.cwd(), "septa.db");

const sqlite = new Database(DB_PATH);
sqlite.exec(`
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

export const db = drizzle(sqlite, { schema: { trainSnapshots } });
export { trainSnapshots };
