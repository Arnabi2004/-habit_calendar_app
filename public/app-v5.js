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
const editTodayButton = document.querySelector("#editTodayButton");
const summaryTitle = document.querySelector("#summaryTitle");
const monthSummary = document.querySelector("#monthSummary");
const habitToast = document.querySelector("#habitToast");
const APP_VERSION = "render-v5";
const EDIT_LIFE_LIMIT = 10;
const morningMessages = [
  "Good morning love 🌞💛",
  "Good morning Arnabi ji 🌼✨",
  "Good morning cutie ji 🥰🌸",
  "Good morning love ji ☀️💕",
  "Rise and shine, my favorite person 🌞💫",
  "Good morning meri jaan 🌻💛",
  "Good morning sunshine girl ☀️🌷",
  "Good morning pretty soul 💕🌼",
  "Good morning my sweet Arnabi ✨💛",
  "Good morning cutie pie 🌸🥰",
  "Good morning my calm happiness 🌞🤍",
  "Good morning love, proud of you 💛🌿",
  "Good morning beautiful ji 🌷✨",
  "Good morning sleepy cutie 🌞💕",
  "Good morning my little star 🌟💛",
  "Good morning sweetheart 🌼🥰",
  "Good morning my favorite smile 😊☀️",
  "Good morning love, new day new magic ✨💛",
  "Good morning Arnabi, you did it 🌞🌸",
  "Good morning my sunshine ji ☀️💕",
  "Good morning beautiful human 🌻🤍",
  "Good morning my soft heart 🌸💛",
  "Good morning love, keep glowing ✨🌞",
  "Good morning cutie, proud of your discipline 🥰🌿",
  "Good morning meri pyaari Arnabi 🌼💕",
  "Good morning my happy place ☀️🤍",
  "Good morning love, sending hugs 🤗💛",
  "Good morning my gentle star 🌟🌸",
  "Good morning cutie ji, shine today 🌞✨",
  "Good morning my lovely girl 💕☀️",
  "Good morning love, you make mornings better 🌻💛",
];
const nightMessages = [
  "Good night love 🌙💙",
  "Good night Arnabi ji ✨🌙",
  "Good night cutie ji 🥰💤",
  "Good night love ji 💙🌌",
  "Sleep well, my favorite person 🌙🤍",
  "Good night meri jaan ✨💙",
  "Good night sunshine girl, rest well 🌙🌷",
  "Good night pretty soul 💕🌌",
  "Good night my sweet Arnabi 💤💙",
  "Good night cutie pie 🌙🥰",
  "Good night my calm happiness ✨🤍",
  "Good night love, proud of your day 💙🌿",
  "Good night beautiful ji 🌙✨",
  "Good night sleepy cutie 💤💕",
  "Good night my little star 🌟💙",
  "Good night sweetheart 🌙🥰",
  "Good night my favorite smile 😊🌌",
  "Good night love, dream softly ✨💙",
  "Good night Arnabi, you did amazing 🌙🌸",
  "Good night my moonlight ji 🌙💕",
  "Good night beautiful human 🌌🤍",
  "Good night my soft heart 💙🌸",
  "Good night love, rest and glow ✨🌙",
  "Good night cutie, proud of your discipline 🥰🌿",
  "Good night meri pyaari Arnabi 🌙💕",
  "Good night my happy place ✨🤍",
  "Good night love, sending hugs 🤗💙",
  "Good night my gentle star 🌟🌙",
  "Good night cutie ji, sleep peacefully 💤✨",
  "Good night my lovely girl 💕🌌",
  "Good night love, tomorrow awaits you 🌙💙",
];
const meditationMessage = "Meditation done, my calm queen 🧘‍♀️💜✨";

let toastTimer = null;

let currentDate = new Date();
currentDate.setDate(1);
let latestMonthData = null;
let latestTodayData = null;
let editMode = false;
let editToken = "";
let editLifeSaving = false;

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

  if (latestTodayData && hasVisibleCountdown()) {
    updateTodayStatuses();
  }
}

function hasVisibleCountdown() {
  return Boolean(todayHabits.querySelector("small"));
}

function monthValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function setMonthFromInput(value) {
  const [year, month] = value.split("-").map(Number);
  currentDate = new Date(year, month - 1, 1);
}

function messageForHabit(habitKey, logDate) {
  const dayIndex = Number(logDate.slice(-2)) - 1;
  if (habitKey === "wake_6am") {
    return morningMessages[dayIndex] || morningMessages[0];
  }
  if (habitKey === "sleep_11pm") {
    return nightMessages[dayIndex] || nightMessages[0];
  }
  if (habitKey === "meditation_10min") {
    return meditationMessage;
  }
  return "";
}

function showHabitToast(message) {
  if (!message) {
    return;
  }

  clearTimeout(toastTimer);
  habitToast.textContent = message;
  habitToast.classList.add("show");
  toastTimer = setTimeout(() => {
    habitToast.classList.remove("show");
  }, 3000);
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
  renderEditButton();
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

  return { disabled: true, message: completed ? "completed" : "missed today" };
}

function todayData(data) {
  const today = isoDate(new Date());
  return data.days.find((day) => day.date === today) || {
    date: today,
    habits: Object.fromEntries(habitKeys.map((key) => [key, false])),
  };
}

function editLifeFromData(data) {
  const life = data?.editLife || {};
  const limit = Number.isInteger(life.limit) ? life.limit : EDIT_LIFE_LIMIT;
  const used = Number.isInteger(life.used) ? life.used : 0;
  const remaining = Number.isInteger(life.remaining) ? life.remaining : Math.max(0, limit - used);
  return { limit, used, remaining };
}

function sameMonthData(first, second) {
  return Boolean(first && second && first.year === second.year && first.month === second.month);
}

function setEditLife(data, editLife) {
  if (data) {
    data.editLife = editLife;
  }
}

function renderEditButton() {
  const life = editLifeFromData(latestTodayData);
  const locked = !editMode && life.remaining <= 0;
  editTodayButton.innerHTML = `
    <span class="heart-icon" aria-hidden="true">❤️</span>
    <span class="life-count">${life.remaining}</span>
  `;
  editTodayButton.disabled = locked || editLifeSaving;
  editTodayButton.classList.toggle("active", editMode);
  editTodayButton.classList.toggle("empty", locked);
  editTodayButton.setAttribute(
    "aria-label",
    editMode ? "Close edit mode" : `${life.remaining} edit lives left this month`,
  );
  editTodayButton.title = editMode
    ? "Close edit mode"
    : `${life.remaining} edit lives left this month`;
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
      const locked = editMode ? false : status.disabled;
      return `
        <label class="today-check ${today.habits[key] ? "done" : ""} ${
          locked ? "locked" : ""
        }">
          <input
            type="checkbox"
            data-date="${today.date}"
            data-habit="${key}"
            ${today.habits[key] ? "checked" : ""}
            ${locked ? "disabled" : ""}
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

function updateTodayStatuses() {
  const today = isoDate(new Date());
  todayHabits.querySelectorAll("input[data-habit]").forEach((input) => {
    const key = input.dataset.habit;
    const completed = input.checked;
    const status = strictStatus(today, key, completed);
    const locked = editMode ? false : status.disabled;
    const card = input.closest(".today-check");
    const text = card.querySelector("span");
    let helper = text.querySelector("small");

    input.disabled = locked;
    card.classList.toggle("locked", locked);

    if (status.message) {
      if (!helper) {
        helper = document.createElement("small");
        text.append(helper);
      }
      helper.textContent = status.message;
    } else if (helper) {
      helper.remove();
    }
  });
}

function setEditMode(enabled) {
  editMode = enabled;
  editToken = editMode ? `edit-${Date.now()}-${Math.random().toString(16).slice(2)}` : "";
  renderEditButton();
  if (latestTodayData) {
    renderTodayPanel(latestTodayData);
  }
}

async function spendEditLife() {
  editLifeSaving = true;
  renderEditButton();

  const response = await fetch("/api/edit-life", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  editLifeSaving = false;

  if (!response.ok) {
    renderEditButton();
    return false;
  }

  const data = await response.json();
  setEditLife(latestTodayData, data.editLife);
  if (sameMonthData(latestMonthData, latestTodayData)) {
    setEditLife(latestMonthData, data.editLife);
  }
  renderEditButton();
  return true;
}

function setHabitInData(data, logDate, habitKey, completed) {
  if (!data) {
    return;
  }

  const day = data.days.find((item) => item.date === logDate);
  if (day) {
    day.habits[habitKey] = completed;
  }
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
  const completed = input.checked;
  const response = await fetch("/api/habit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: input.dataset.date,
      habit: input.dataset.habit,
      completed,
      adminEdit: editMode,
      editToken,
    }),
  });

  if (!response.ok) {
    input.checked = false;
    updateTodayStatuses();
    return;
  }

  setHabitInData(latestTodayData, input.dataset.date, input.dataset.habit, completed);
  setHabitInData(latestMonthData, input.dataset.date, input.dataset.habit, completed);
  renderTodayPanel(latestTodayData);
  renderCalendar(latestMonthData);
  if (completed) {
    showHabitToast(messageForHabit(input.dataset.habit, input.dataset.date));
  }
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

editTodayButton.addEventListener("click", () => {
  if (editMode) {
    setEditMode(false);
    return;
  }

  const life = editLifeFromData(latestTodayData);
  if (life.remaining <= 0 || editLifeSaving) {
    renderEditButton();
    return;
  }

  spendEditLife().then((spent) => {
    if (spent) {
      setEditMode(true);
    }
  });
});

loadMonth();
updateClock();
setInterval(updateClock, 1000);

console.info(`Daily Rhythm loaded: ${APP_VERSION}`);
