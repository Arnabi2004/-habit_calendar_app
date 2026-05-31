import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_DIR = resolve(ROOT_DIR, "public");
const DATA_DIR = resolve(process.env.DATA_DIR || join(ROOT_DIR, "storage"));
const DATA_PATH = join(DATA_DIR, "habits.json");
const HOST = "0.0.0.0";
const PORT = Number(process.env.PORT || 10000);
const TIME_ZONE = "Asia/Kolkata";
const EDIT_LIFE_LIMIT = 10;
const EDIT_LIFE_STORE_KEY = "__editLife";

const HABITS = {
  wake_6am: "Wake Up",
  meditation_10min: "Meditation",
  sleep_11pm: "Sleep",
};

const STRICT_WINDOWS = {
  wake_6am: { start: "06:00:00", end: "07:00:00" },
  sleep_11pm: { start: "23:00:00", end: "23:59:59" },
};
const STRICT_HABIT_KEYS = new Set(Object.keys(STRICT_WINDOWS));

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function json(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body),
    "content-type": "application/json; charset=utf-8",
  });
  res.end(body);
}

function currentKolkataParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const value = (type) => parts.find((part) => part.type === type)?.value;
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}:${value("second")}`,
  };
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function monthName(month) {
  return new Intl.DateTimeFormat("en", { month: "long" }).format(
    new Date(2026, month - 1, 1),
  );
}

function monthKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function editLifeForMonth(logs, year, month) {
  const key = monthKey(year, month);
  const used = Number(logs[EDIT_LIFE_STORE_KEY]?.[key] || 0);
  return {
    limit: EDIT_LIFE_LIMIT,
    used,
    remaining: Math.max(0, EDIT_LIFE_LIMIT - used),
  };
}

function canCompleteStrictHabit(habitKey, logDate) {
  const window = STRICT_WINDOWS[habitKey];
  if (!window) {
    return true;
  }

  const now = currentKolkataParts();
  return logDate === now.date && now.time >= window.start && now.time <= window.end;
}

async function readLogs() {
  try {
    return JSON.parse(await readFile(DATA_PATH, "utf8"));
  } catch {
    return {};
  }
}

async function writeLogs(logs) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_PATH, JSON.stringify(logs, null, 2));
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function handleMonth(req, res, url) {
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    json(res, 400, { error: "Invalid year or month" });
    return;
  }

  const logs = await readLogs();
  const totalDays = daysInMonth(year, month);
  const days = Array.from({ length: totalDays }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    const date = `${year}-${String(month).padStart(2, "0")}-${day}`;
    const saved = logs[date] || {};

    return {
      date,
      habits: Object.fromEntries(
        Object.keys(HABITS).map((habitKey) => [habitKey, Boolean(saved[habitKey])]),
      ),
    };
  });

  json(res, 200, {
    year,
    month,
    monthName: monthName(month),
    editLife: editLifeForMonth(logs, year, month),
    habits: Object.entries(HABITS).map(([key, label]) => ({ key, label })),
    days,
  });
}

async function handleEditLife(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  const now = currentKolkataParts();
  const [yearText, monthText] = now.date.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const key = monthKey(year, month);
  const logs = await readLogs();
  const used = Number(logs[EDIT_LIFE_STORE_KEY]?.[key] || 0);

  if (used >= EDIT_LIFE_LIMIT) {
    json(res, 400, {
      error: "No edit lives left this month",
      editLife: editLifeForMonth(logs, year, month),
    });
    return;
  }

  logs[EDIT_LIFE_STORE_KEY] = {
    ...(logs[EDIT_LIFE_STORE_KEY] || {}),
    [key]: used + 1,
  };
  await writeLogs(logs);

  json(res, 200, {
    ok: true,
    editLife: editLifeForMonth(logs, year, month),
  });
}

async function handleHabit(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readRequestBody(req));
  } catch {
    json(res, 400, { error: "Invalid JSON" });
    return;
  }

  const logDate = payload.date;
  const habitKey = payload.habit;
  const completed = Boolean(payload.completed);
  const adminEdit = Boolean(payload.adminEdit || payload.override);
  const hasEditToken = typeof payload.editToken === "string" && payload.editToken.startsWith("edit-");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate) || !HABITS[habitKey]) {
    json(res, 400, { error: "Invalid habit update" });
    return;
  }

  if (logDate !== currentKolkataParts().date) {
    json(res, 400, { error: "Only today's progress can be edited" });
    return;
  }

  if (STRICT_HABIT_KEYS.has(habitKey) && !(adminEdit && hasEditToken) && !canCompleteStrictHabit(habitKey, logDate)) {
    json(res, 400, { error: "This habit can only be ticked during its strict time window" });
    return;
  }

  const logs = await readLogs();
  logs[logDate] = {
    ...(logs[logDate] || {}),
    [habitKey]: completed,
  };
  await writeLogs(logs);
  json(res, 200, { ok: true });
}

function serveStatic(req, res, url) {
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(PUBLIC_DIR, `.${safePath}`);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    json(res, 404, { error: "Not found" });
    return;
  }

  const ext = extname(filePath);
  res.writeHead(200, {
    "cache-control": "no-cache",
    "content-type": CONTENT_TYPES[ext] || "application/octet-stream",
  });

  createReadStream(filePath)
    .on("error", () => {
      if (!res.headersSent) {
        json(res, 404, { error: "Not found" });
      } else {
        res.end();
      }
    })
    .pipe(res);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname === "/api/month") {
      await handleMonth(req, res, url);
      return;
    }
    if (url.pathname === "/api/habit") {
      await handleHabit(req, res);
      return;
    }
    if (url.pathname === "/api/edit-life") {
      await handleEditLife(req, res);
      return;
    }
    serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    json(res, 500, { error: "Server error" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Daily Rhythm running on http://${HOST}:${PORT}`);
  console.log(`Habit data path: ${DATA_PATH}`);
});
