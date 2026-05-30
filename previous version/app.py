import os
import threading
import time
import webbrowser
from http.server import ThreadingHTTPServer

from server import HabitHandler, init_db


HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8000"))
LOCAL_URL = f"http://127.0.0.1:{PORT}"


def open_browser():
    time.sleep(0.8)
    webbrowser.open(LOCAL_URL)


if __name__ == "__main__":
    init_db()
    if HOST in ("127.0.0.1", "localhost") and os.environ.get("OPEN_BROWSER", "1") != "0":
        threading.Thread(target=open_browser, daemon=True).start()
    print(f"Habit tracker running at http://{HOST}:{PORT}")
    ThreadingHTTPServer((HOST, PORT), HabitHandler).serve_forever()
