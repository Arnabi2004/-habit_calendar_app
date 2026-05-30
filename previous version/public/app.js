const habitKeys = ["wake_6am", "meditation_10min", "sleep_11pm"];
const habitMeta = {
  wake_6am: { label: "Wake Up", short: "Wake Up" },
  meditation_10min: { label: "Meditation", short: "Meditation" },
  sleep_11pm: { label: "Sleep", short: "Sleep" },
};
const strictWindows = {
  wake_6am: { startHour: 6, startMinute: 0, endHour: 7, endMinute: 0 },
  sleep_11pm: { startHour: 23, startMinute: 0, endHour: 23, endMinute: 59, endSecond: 59 },
};

const monthPicker = document.querySelector("#monthPicker");
const prevMonth = document.querySelector("#prevMonth");
const nextMonth = document.querySelector("#nextMonth");
const clockTime = document.querySelector("#clockTime");
const clockDate = document.querySelector("#clockDate");
const todayTitle = document.querySelector("#todayTitle");
const todayHabits = document.querySelector("#todayHabits");
const summaryTitle = document.querySelector("#summaryTitle");
const monthSummary = document.querySelector("#monthSummary");

let currentDate = new Date();
currentDate.setDate(1);
let latestMonthData = null;
let latestTodayData = null;

function updateClock() {
  const now = new Date();
  clockTime.textContent = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  clockDate.textContent = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  if (latestTodayData) {
    renderTodayPanel(latestTodayData);
  }

  if (latestMonthData) {
    renderCalendar(latestMonthData);
  }
}

function monthValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function setMonthFromInput(value) {
  const [year, month] = value.split("-").map(Number);
  currentDate = new Date(year, month - 1, 1);
}

async function loadMonth() {
  monthPicker.value = monthValue(currentDate);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const response = await fetch(`/api/month?year=${year}&month=${month}`);
  const data = await response.json();
  latestMonthData = data;
  const today = new Date();
  if (monthValue(currentDate) === monthValue(today)) {
    latestTodayData = data;
  } else {
    const todayResponse = await fetch(
      `/api/month?year=${today.getFullYear()}&month=${today.getMonth() + 1}`,
    );
    latestTodayData = await todayResponse.json();
  }
  renderTodayPanel(latestTodayData);
  renderCalendar(data);
}

function isoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  }
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function strictStatus(dateText, habitKey, completed) {
  const now = new Date();
  const isToday = dateText === isoDate(now);

  if (!isToday) {
    return { disabled: true, message: "" };
  }

  const window = strictWindows[habitKey];
  if (!window) {
    return { disabled: false, message: "" };
  }

  const start = new Date(now);
  start.setHours(window.startHour, window.startMinute, 0, 0);

  const end = new Date(now);
  end.setHours(window.endHour, window.endMinute, window.endSecond || 0, 999);

  if (now < start) {
    return { disabled: true, message: "" };
  }

  if (now <= end) {
    return { disabled: false, message: `${formatDuration(end - now)} left` };
  }

  return { disabled: !completed, message: completed ? "completed" : "missed today" };
}

function todayData(data) {
  const today = isoDate(new Date());
  return data.days.find((day) => day.date === today) || {
    date: today,
    habits: Object.fromEntries(habitKeys.map((key) => [key, false])),
  };
}

function renderTodayPanel(data) {
  const today = todayData(data);
  const titleDate = new Date(`${today.date}T00:00:00`);
  todayTitle.textContent = titleDate.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  todayHabits.innerHTML = habitKeys
    .map((key) => {
      const status = strictStatus(today.date, key, today.habits[key]);
      const helperText = status.message;
      return `
        <label class="today-check ${today.habits[key] ? "done" : ""} ${
          status.disabled ? "locked" : ""
        }">
          <input
            type="checkbox"
            data-date="${today.date}"
            data-habit="${key}"
            ${today.habits[key] ? "checked" : ""}
            ${status.disabled ? "disabled" : ""}
          >
          <span>
            <strong>${habitMeta[key].label}</strong>
            ${helperText ? `<small>${helperText}</small>` : ""}
          </span>
        </label>
      `;
    })
    .join("");
}

function renderCalendar(data) {
  renderMonthSummary(data);
}

function renderMonthSummary(data) {
  summaryTitle.textContent = `${data.monthName} ${data.year}`;
  const headerCells = data.days
    .map((day) => `<th scope="col">${new Date(`${day.date}T00:00:00`).getDate()}</th>`)
    .join("");

  const rows = habitKeys
    .map((key) => {
      const dayCells = data.days
        .map(
          (day) => `
            <td class="${day.habits[key] ? "complete" : "missed"}">
              <span aria-label="${day.habits[key] ? "Completed" : "Not completed"}">${
                day.habits[key] ? "✓" : ""
              }</span>
            </td>
          `,
        )
        .join("");

      return `
        <tr>
          <th scope="row">${habitMeta[key].label}</th>
          ${dayCells}
        </tr>
      `;
    })
    .join("");

  monthSummary.innerHTML = `
    <table>
      <thead>
        <tr>
          <th scope="col">Habit</th>
          ${headerCells}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function updateHabit(input) {
  const response = await fetch("/api/habit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: input.dataset.date,
      habit: input.dataset.habit,
      completed: input.checked,
    }),
  });

  if (!response.ok) {
    input.checked = false;
  }
  await loadMonth();
}

todayHabits.addEventListener("change", (event) => {
  if (event.target.matches("input[type='checkbox']")) {
    updateHabit(event.target);
  }
});

monthPicker.addEventListener("change", () => {
  setMonthFromInput(monthPicker.value);
  loadMonth();
});

prevMonth.addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  loadMonth();
});

nextMonth.addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  loadMonth();
});

loadMonth();
updateClock();
setInterval(updateClock, 1000);
