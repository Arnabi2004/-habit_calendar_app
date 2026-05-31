import {
  HABITS,
  STRICT_WINDOWS,
  canCompleteStrictHabit,
  currentKolkataParts,
  jsonResponse,
  readLogs,
  writeLogs,
} from "./shared.mjs";

const STRICT_HABIT_KEYS = new Set(Object.keys(STRICT_WINDOWS));

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const logDate = payload.date;
  const habitKey = payload.habit;
  const completed = Boolean(payload.completed);
  const adminEdit = Boolean(payload.adminEdit || payload.override);
  const hasEditToken = typeof payload.editToken === "string" && payload.editToken.startsWith("edit-");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate) || !HABITS[habitKey]) {
    return jsonResponse({ error: "Invalid habit update" }, 400);
  }

  if (logDate !== currentKolkataParts().date) {
    return jsonResponse({ error: "Only today's progress can be edited" }, 400);
  }

  if (STRICT_HABIT_KEYS.has(habitKey) && !(adminEdit && hasEditToken) && !canCompleteStrictHabit(habitKey, logDate)) {
    return jsonResponse(
      { error: "This habit can only be ticked during its strict time window" },
      400,
    );
  }

  const logs = await readLogs();
  logs[logDate] = {
    ...(logs[logDate] || {}),
    [habitKey]: completed,
  };

  await writeLogs(logs);
  return jsonResponse({ ok: true });
}
