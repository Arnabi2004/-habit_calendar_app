import {
  EDIT_LIFE_LIMIT,
  EDIT_LIFE_STORE_KEY,
  currentKolkataParts,
  editLifeForMonth,
  jsonResponse,
  monthKey,
  readLogs,
  writeLogs,
} from "./shared.mjs";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const now = currentKolkataParts();
  const [yearText, monthText] = now.date.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const key = monthKey(year, month);
  const logs = await readLogs();
  const used = Number(logs[EDIT_LIFE_STORE_KEY]?.[key] || 0);

  if (used >= EDIT_LIFE_LIMIT) {
    return jsonResponse(
      {
        error: "No edit lives left this month",
        editLife: editLifeForMonth(logs, year, month),
      },
      400,
    );
  }

  logs[EDIT_LIFE_STORE_KEY] = {
    ...(logs[EDIT_LIFE_STORE_KEY] || {}),
    [key]: used + 1,
  };

  await writeLogs(logs);
  return jsonResponse({
    ok: true,
    editLife: editLifeForMonth(logs, year, month),
  });
}
