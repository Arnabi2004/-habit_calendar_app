import {
  HABITS,
  daysInMonth,
  editLifeForMonth,
  jsonResponse,
  monthName,
  readLogs,
} from "./shared.mjs";

export async function handler(event) {
  const params = new URLSearchParams(event.rawQuery || "");
  const year = Number(params.get("year"));
  const month = Number(params.get("month"));

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return jsonResponse({ error: "Invalid year or month" }, 400);
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

  return jsonResponse({
    year,
    month,
    monthName: monthName(month),
    editLife: editLifeForMonth(logs, year, month),
    habits: Object.entries(HABITS).map(([key, label]) => ({ key, label })),
    days,
  });
}
