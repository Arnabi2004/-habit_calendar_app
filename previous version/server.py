from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse
import calendar
from datetime import date, datetime, time
import json
import mimetypes
import os
import sqlite3


BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"
DB_PATH = BASE_DIR / "habits.db"

HABITS = {
    "wake_6am": "Wake Up",
    "meditation_10min": "Meditation",
    "sleep_11pm": "Sleep",
}

STRICT_WINDOWS = {
    "wake_6am": (time(6, 0), time(7, 0)),
    "sleep_11pm": (time(23, 0), time(23, 59, 59, 999999)),
}


def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS habit_logs (
                log_date TEXT NOT NULL,
                habit_key TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (log_date, habit_key)
            )
            """
        )


def read_month(year, month):
    if month < 1 or month > 12:
        raise ValueError("Month must be between 1 and 12")

    days_in_month = calendar.monthrange(year, month)[1]
    start = f"{year:04d}-{month:02d}-01"
    end = f"{year:04d}-{month:02d}-{days_in_month:02d}"

    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute(
            """
            SELECT log_date, habit_key, completed
            FROM habit_logs
            WHERE log_date BETWEEN ? AND ?
            """,
            (start, end),
        ).fetchall()

    by_date = {
        f"{year:04d}-{month:02d}-{day:02d}": {key: False for key in HABITS}
        for day in range(1, days_in_month + 1)
    }

    for log_date, habit_key, completed in rows:
        if habit_key in HABITS and log_date in by_date:
            by_date[log_date][habit_key] = bool(completed)

    return {
        "year": year,
        "month": month,
        "monthName": calendar.month_name[month],
        "habits": [{"key": key, "label": label} for key, label in HABITS.items()],
        "days": [{"date": log_date, "habits": habits} for log_date, habits in by_date.items()],
    }


def save_habit(log_date, habit_key, completed):
    if habit_key not in HABITS:
        raise ValueError("Unknown habit")

    today = date.today().isoformat()
    if log_date != today:
        raise ValueError("Only today's progress can be edited")

    if completed and habit_key in STRICT_WINDOWS:
        now = datetime.now().time()
        start, end = STRICT_WINDOWS[habit_key]
        if not (start <= now <= end):
            raise ValueError("This habit can only be ticked during its strict time window")

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO habit_logs (log_date, habit_key, completed, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(log_date, habit_key)
            DO UPDATE SET completed = excluded.completed, updated_at = CURRENT_TIMESTAMP
            """,
            (log_date, habit_key, int(completed)),
        )


class HabitHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/month":
            self.handle_month(parsed.query)
            return

        path = "index.html" if parsed.path in ("/", "") else parsed.path.lstrip("/")
        self.serve_static(path)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/habit":
            self.handle_habit_update()
            return
        self.send_json({"error": "Not found"}, status=404)

    def handle_month(self, query):
        params = parse_qs(query)
        try:
            year = int(params.get("year", [""])[0])
            month = int(params.get("month", [""])[0])
            self.send_json(read_month(year, month))
        except (TypeError, ValueError):
            self.send_json({"error": "Invalid year or month"}, status=400)

    def handle_habit_update(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            save_habit(
                payload["date"],
                payload["habit"],
                bool(payload.get("completed")),
            )
            self.send_json({"ok": True})
        except (json.JSONDecodeError, KeyError, ValueError):
            self.send_json({"error": "Invalid habit update"}, status=400)

    def serve_static(self, relative_path):
        file_path = (PUBLIC_DIR / relative_path).resolve()
        if not file_path.is_file() or PUBLIC_DIR.resolve() not in file_path.parents:
            self.send_json({"error": "Not found"}, status=404)
            return

        content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.end_headers()
        self.wfile.write(file_path.read_bytes())

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    init_db()
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer((host, port), HabitHandler)
    print(f"Habit tracker running at http://{host}:{port}")
    server.serve_forever()
