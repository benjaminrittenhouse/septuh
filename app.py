"""
SEPTA delay dashboard — FastAPI backend.

Serves the static frontend and provides JSON API endpoints.

Usage:
    uvicorn app:app --reload
"""

import sqlite3
from datetime import date, timedelta, timezone, datetime
from pathlib import Path

from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

DB_PATH = "septa.db"
STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI(title="Septuh — SEPTA Delay Tracker")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def get_con() -> sqlite3.Connection:
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/today")
def today_summary():
    """Per-snapshot summary for today (Eastern date based on UTC)."""
    today = date.today().isoformat()
    con = get_con()
    rows = con.execute("""
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
    """, (today,)).fetchall()
    con.close()
    return [dict(r) for r in rows]


@app.get("/api/today/lines")
def today_by_line():
    """Today's delay breakdown by rail line."""
    today = date.today().isoformat()
    con = get_con()
    rows = con.execute("""
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
    """, (today,)).fetchall()
    con.close()
    return [dict(r) for r in rows]


@app.get("/api/history")
def history(days: int = Query(default=30, ge=1, le=365)):
    """Daily delay summary for the past N days."""
    since = (date.today() - timedelta(days=days)).isoformat()
    con = get_con()
    rows = con.execute("""
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
    """, (since,)).fetchall()
    con.close()
    return [dict(r) for r in rows]


@app.get("/api/history/lines")
def history_by_line(days: int = Query(default=30, ge=1, le=365)):
    """Per-line daily stats for the past N days."""
    since = (date.today() - timedelta(days=days)).isoformat()
    con = get_con()
    rows = con.execute("""
        SELECT
            date(captured_at) AS day,
            COALESCE(line, 'Unknown') AS line,
            COUNT(*) AS total,
            SUM(CASE WHEN late_min > 0 THEN 1 ELSE 0 END) AS late_count,
            ROUND(100.0 * SUM(CASE WHEN late_min > 0 THEN 1 ELSE 0 END) / COUNT(*), 1) AS late_pct,
            ROUND(AVG(CASE WHEN late_min > 0 THEN late_min END), 1) AS avg_late_min
        FROM train_snapshots
        WHERE date(captured_at) >= ?
        GROUP BY day, line
        ORDER BY day, late_pct DESC
    """, (since,)).fetchall()
    con.close()
    return [dict(r) for r in rows]


@app.get("/api/worst")
def worst_trains(days: int = Query(default=7, ge=1, le=90), limit: int = Query(default=10, ge=1, le=50)):
    """Trains with the most delay observations in the past N days."""
    since = (date.today() - timedelta(days=days)).isoformat()
    con = get_con()
    rows = con.execute("""
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
    """, (since, limit)).fetchall()
    con.close()
    return [dict(r) for r in rows]


@app.get("/api/status")
def status():
    """DB row count and date range — useful to confirm data is flowing."""
    con = get_con()
    row = con.execute("""
        SELECT
            COUNT(*) AS total_rows,
            MIN(date(captured_at)) AS earliest,
            MAX(date(captured_at)) AS latest,
            COUNT(DISTINCT date(captured_at)) AS days_with_data
        FROM train_snapshots
    """).fetchone()
    con.close()
    return dict(row)
