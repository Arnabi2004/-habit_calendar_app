import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export const HABITS = {
  wake_6am: "Wake Up",
  meditation_10min: "Meditation",
  sleep_11pm: "Sleep",
};

export const STRICT_WINDOWS = {
  wake_6am: { start: "06:00:00", end: "07:00:00" },
  sleep_11pm: { start: "23:00:00", end: "23:59:59" },
};

const STORE_NAME = "daily-rhythm-habits";
const STORE_KEY = "habit-logs";
const LOCAL_DATA_PATH = join(process.cwd(), ".netlify", "local-habits.json");
const TIME_ZONE = "Asia/Kolkata";
export const EDIT_LIFE_LIMIT = 10;
export const EDIT_LIFE_STORE_KEY = "__editLife";

export function jsonResponse(payload, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
    body: JSON.stringify(payload),
  };
}

export function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function monthName(month) {
  return new Intl.DateTimeFormat("en", { month: "long" }).format(
    new Date(2026, month - 1, 1),
  );
}

export function monthKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function editLifeForMonth(logs, year, month) {
  const key = monthKey(year, month);
  const used = Number(logs[EDIT_LIFE_STORE_KEY]?.[key] || 0);
  return {
    limit: EDIT_LIFE_LIMIT,
    used,
    remaining: Math.max(0, EDIT_LIFE_LIMIT - used),
  };
}

export function currentKolkataParts() {
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

export function canCompleteStrictHabit(habitKey, logDate) {
  const window = STRICT_WINDOWS[habitKey];
  if (!window) {
    return true;
  }

  const now = currentKolkataParts();
  return logDate === now.date && now.time >= window.start && now.time <= window.end;
}

async function blobStore() {
  try {
    const { getStore } = await import("@netlify/blobs");
    return getStore({ name: STORE_NAME, consistency: "strong" });
  } catch {
    return null;
  }
}

export async function readLogs() {
  const store = await blobStore();
  if (store) {
    const data = await store.get(STORE_KEY, { type: "json", consistency: "strong" });
    return data || {};
  }

  try {
    return JSON.parse(await readFile(LOCAL_DATA_PATH, "utf8"));
  } catch {
    return {};
  }
}

export async function writeLogs(logs) {
  const store = await blobStore();
  if (store) {
    await store.setJSON(STORE_KEY, logs);
    return;
  }

  await mkdir(dirname(LOCAL_DATA_PATH), { recursive: true });
  await writeFile(LOCAL_DATA_PATH, JSON.stringify(logs, null, 2));
}
