"""
SEPTA train delay collector.
Polls the SEPTA TrainView API every 5 minutes and stores snapshots to SQLite.

Usage:
    python collector.py            # run continuously
    python collector.py --once     # single fetch and exit
"""

import argparse
import sqlite3
import time
import logging
from datetime import datetime

import requests
import schedule

SEPTA_TRAINVIEW_URL = "https://www3.septa.org/api/TrainView/index.php"
DB_PATH = "septa.db"
POLL_INTERVAL_MINUTES = 5

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger(__name__)


def init_db(path: str = DB_PATH) -> None:
    con = sqlite3.connect(path)
    con.execute("""
        CREATE TABLE IF NOT EXISTS train_snapshots (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            captured_at TEXT    NOT NULL,
            train_no    TEXT,
            line        TEXT,
            origin      TEXT,
            destination TEXT,
            late_min    INTEGER NOT NULL DEFAULT 0,
            status      TEXT
        )
    """)
    con.execute("CREATE INDEX IF NOT EXISTS idx_captured_at ON train_snapshots(captured_at)")
    con.commit()
    con.close()


def fetch_trains() -> list[dict]:
    try:
        resp = requests.get(SEPTA_TRAINVIEW_URL, timeout=15)
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        log.error("Failed to fetch SEPTA data: %s", exc)
        return []


def store_snapshot(trains: list[dict], captured_at: str, path: str = DB_PATH) -> int:
    rows = []
    for t in trains:
        try:
            late = int(t.get("late", 0) or 0)
        except (ValueError, TypeError):
            late = 0
        # SEPTA uses 999 as a sentinel for cancelled / out-of-service trains
        status = "cancelled" if late >= 999 else ("late" if late > 0 else "on_time")
        rows.append((
            captured_at,
            t.get("trainno") or t.get("train_no"),
            t.get("line"),
            t.get("SOURCE"),
            t.get("dest"),
            late,
            status,
        ))
    con = sqlite3.connect(path)
    con.executemany(
        "INSERT INTO train_snapshots (captured_at, train_no, line, origin, destination, late_min, status) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        rows,
    )
    con.commit()
    con.close()
    return len(rows)


def collect_once() -> None:
    now = datetime.now().isoformat(timespec="seconds")  # local time — keeps date queries simple
    trains = fetch_trains()
    if not trains:
        log.warning("No train data returned.")
        return
    count = store_snapshot(trains, now)
    late = sum(1 for t in trains if int(t.get("late", 0) or 0) > 0)
    log.info("Captured %d trains (%d late) at %s", count, late, now)


def run_loop() -> None:
    log.info("Starting collector — polling every %d minutes.", POLL_INTERVAL_MINUTES)
    collect_once()
    schedule.every(POLL_INTERVAL_MINUTES).minutes.do(collect_once)
    while True:
        schedule.run_pending()
        time.sleep(10)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SEPTA delay collector")
    parser.add_argument("--once", action="store_true", help="Fetch once and exit")
    parser.add_argument("--db", default=DB_PATH, help="SQLite database path")
    args = parser.parse_args()

    DB_PATH = args.db
    init_db(DB_PATH)

    if args.once:
        collect_once()
    else:
        run_loop()
