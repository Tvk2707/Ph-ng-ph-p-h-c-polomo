const storageKey = "time-management-app-v1";

const state = {
  tasks: [],
  selectedTaskId: null,
  filter: "all",
  searchTerm: "",
  timerMode: "work",
  isRunning: false,
  workSeconds: 25 * 60,
  breakSeconds: 5 * 60,
  remainingSeconds: 25 * 60,
  pomodoroCount: 0,
  history: {},
};

const dom = {
  taskTitle: document.getElementById("taskTitle"),
  taskCategory: document.getElementById("taskCategory"),
  addTaskBtn: document.getElementById("addTaskBtn"),
  taskSearch: document.getElementById("taskSearch"),
  filterButtons: document.querySelectorAll(".filter-buttons button"),
  taskList: document.getElementById("taskList"),
  taskTemplate: document.getElementById("taskTemplate"),
  timerLabel: document.getElementById("timerLabel"),
  timerValue: document.getElementById("timerValue"),
  selectedTaskLabel: document.getElementById("selectedTaskLabel"),
  startBtn: document.getElementById("startBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  resetBtn: document.getElementById("resetBtn"),
  workDuration: document.getElementById("workDuration"),
  breakDuration: document.getElementById("breakDuration"),
  completedTasksValue: document.getElementById("completedTasksValue"),
  pomodoroCountValue: document.getElementById("pomodoroCountValue"),
  focusTaskValue: document.getElementById("focusTaskValue"),
  chartBars: document.getElementById("chartBars"),
  themeToggle: document.getElementById("themeToggle"),
  progressCircle: document.getElementById("progressCircle"),
};

function loadState() {
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    const parsed = JSON.parse(stored);
    Object.assign(state, parsed);
    state.workSeconds = parsed.workSeconds || state.workSeconds;
    state.breakSeconds = parsed.breakSeconds || state.breakSeconds;
    state.timerMode = parsed.timerMode || state.timerMode;
    state.remainingSeconds = parsed.remainingSeconds || state.remainingSeconds;
  }
}

function saveState() {
  const data = {
    tasks: state.tasks,
    selectedTaskId: state.selectedTaskId,
    filter: state.filter,
    searchTerm: state.searchTerm,
    history: state.history,
    pomodoroCount: state.pomodoroCount,
    workSeconds: state.workSeconds,
    breakSeconds: state.breakSeconds,
    timerMode: state.timerMode,
    remainingSeconds: state.remainingSeconds,
  };
  localStorage.setItem(storageKey, JSON.stringify(data));
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function updateTimerDisplay() {
  dom.timerValue.textContent = formatTime(state.remainingSeconds);
  dom.timerLabel.textContent = state.timerMode === "work" ? "Work" : "Break";
  const selected = state.tasks.find((task) => task.id === state.selectedTaskId);
  dom.selectedTaskLabel.textContent = selected ? `Focus: ${selected.title}` : "Chưa chọn task";
  const total = state.timerMode === "work" ? state.workSeconds : state.breakSeconds;
  const progress = 1 - state.remainingSeconds / total;
  const dashOffset = 327 - progress * 327;
  dom.progressCircle.style.strokeDashoffset = dashOffset;
}

function updateStats() {
  const completedTasks = state.tasks.filter((task) => task.completed).length;
  dom.completedTasksValue.textContent = completedTasks;
  dom.pomodoroCountValue.textContent = state.pomodoroCount;
  dom.focusTaskValue.textContent = state.selectedTaskId ? state.tasks.find((t) => t.id === state.selectedTaskId)?.focusSessions || 0 : 0;
}

function buildHistoryChart() {
  const labels = [];
  const bars = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    labels.push(key.slice(5));
    bars.push(state.history[key] || 0);
  }
  const maxValue = Math.max(...bars, 1);
  dom.chartBars.innerHTML = bars
    .map(
      (value, idx) =>
        `<div style="height: ${Math.max((value / maxValue) * 100, 8)}%;" data-label="${labels[idx]}"><span>${value}</span></div>`
    )
    .join("");
}

function getFilteredTasks() {
  return state.tasks
    .filter((task) => {
      if (state.filter === "completed") return task.completed;
      if (state.filter === "pending") return !task.completed;
      return true;
    })
    .filter((task) => task.title.toLowerCase().includes(state.searchTerm.toLowerCase()));
}

function renderTasks() {
  dom.taskList.innerHTML = "";
  const tasks = getFilteredTasks();
  if (tasks.length === 0) {
    dom.taskList.innerHTML = `<p class="empty-state">Không có task nào phù hợp.</p>`;
    return;
  }
  tasks.forEach((task) => {
    const item = dom.taskTemplate.content.cloneNode(true);
    const card = item.querySelector("article");
    const title = item.querySelector(".task-title");
    const meta = item.querySelector(".task-meta");
    const checkbox = item.querySelector(".task-checkbox");
    const focusBtn = item.querySelector(".focus-btn");
    const editBtn = item.querySelector(".edit-btn");
    const deleteBtn = item.querySelector(".delete-btn");

    title.textContent = task.title;
    meta.textContent = `${task.category} • ${task.focusSessions} phiên`; 
    checkbox.checked = task.completed;
    if (task.completed) card.classList.add("completed");

    checkbox.addEventListener("change", () => toggleTaskCompleted(task.id));
    focusBtn.addEventListener("click", () => selectTask(task.id));
    editBtn.addEventListener("click", () => editTask(task.id));
    deleteBtn.addEventListener("click", () => deleteTask(task.id));

    card.addEventListener("dragstart", () => card.classList.add("dragging"));
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
    card.addEventListener("dragover", (event) => event.preventDefault());
    card.addEventListener("drop", () => reorderTask(task.id));

    dom.taskList.appendChild(item);
  });
}

function toggleTaskCompleted(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveState();
  updateStats();
  renderTasks();
}

function selectTask(id) {
  state.selectedTaskId = id;
  saveState();
  updateTimerDisplay();
  updateStats();
}

function editTask(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  const newTitle = prompt("Chỉnh sửa tên task", task.title);
  if (newTitle && newTitle.trim()) {
    task.title = newTitle.trim();
    saveState();
    renderTasks();
  }
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((task) => task.id !== id);
  if (state.selectedTaskId === id) state.selectedTaskId = null;
  saveState();
  updateStats();
  renderTasks();
  updateTimerDisplay();
}

function addTask() {
  const title = dom.taskTitle.value.trim();
  const category = dom.taskCategory.value;
  if (!title) return;
  state.tasks.unshift({
    id: crypto.randomUUID(),
    title,
    category,
    completed: false,
    focusSessions: 0,
    createdAt: Date.now(),
  });
  dom.taskTitle.value = "";
  saveState();
  updateStats();
  renderTasks();
}

function setFilter(filter) {
  state.filter = filter;
  dom.filterButtons.forEach((button) => button.classList.toggle("active", button.dataset.filter === filter));
  renderTasks();
}

function updateSearch(value) {
  state.searchTerm = value;
  renderTasks();
}

function updateDurations() {
  const workMinutes = Math.max(1, parseInt(dom.workDuration.value, 10) || 25);
  const breakMinutes = Math.max(1, parseInt(dom.breakDuration.value, 10) || 5);
  state.workSeconds = workMinutes * 60;
  state.breakSeconds = breakMinutes * 60;
  if (!state.isRunning) {
    state.remainingSeconds = state.timerMode === "work" ? state.workSeconds : state.breakSeconds;
  }
  updateTimerDisplay();
}

let timerInterval = null;

function startTimer() {
  if (state.isRunning) return;
  state.isRunning = true;
  timerInterval = setInterval(() => {
    if (state.remainingSeconds <= 0) {
      completeTimerCycle();
      return;
    }
    state.remainingSeconds -= 1;
    updateTimerDisplay();
  }, 1000);
}

function pauseTimer() {
  state.isRunning = false;
  clearInterval(timerInterval);
}

function resetTimer() {
  pauseTimer();
  state.remainingSeconds = state.timerMode === "work" ? state.workSeconds : state.breakSeconds;
  updateTimerDisplay();
}

function completeTimerCycle() {
  pauseTimer();
  notifyCycleEnd();
  if (state.timerMode === "work") {
    state.pomodoroCount += 1;
    const today = getTodayKey();
    state.history[today] = (state.history[today] || 0) + 1;
    const selected = state.tasks.find((task) => task.id === state.selectedTaskId);
    if (selected) {
      selected.focusSessions += 1;
    }
  }
  state.timerMode = state.timerMode === "work" ? "break" : "work";
  state.remainingSeconds = state.timerMode === "work" ? state.workSeconds : state.breakSeconds;
  saveState();
  updateStats();
  buildHistoryChart();
  updateTimerDisplay();
  startTimer();
}

function notifyCycleEnd() {
  const message = state.timerMode === "work" ? "Hoàn thành Pomodoro! Bắt đầu nghỉ ngơi." : "Kết thúc nghỉ, quay lại làm việc.";
  if (Notification.permission === "granted") {
    new Notification("Time Manager", { body: message });
  }
  playBeep();
}

function playBeep() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 520;
  gain.gain.value = 0.12;
  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.18);
}

function updateTheme() {
  const isDark = document.body.classList.toggle("dark");
  dom.themeToggle.textContent = isDark ? "☀️" : "🌙";
  localStorage.setItem("theme-mode", isDark ? "dark" : "light");
}

function restoreTheme() {
  const stored = localStorage.getItem("theme-mode");
  if (stored === "dark") document.body.classList.add("dark");
  dom.themeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
}

function reorderTask(targetId) {
  const dragged = state.tasks.find((task) => task.id === targetId);
  if (!dragged) return;
  state.tasks = state.tasks.filter((task) => task.id !== targetId);
  state.tasks.unshift(dragged);
  saveState();
  renderTasks();
}

function requestNotificationPermission() {
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function attachEvents() {
  dom.addTaskBtn.addEventListener("click", addTask);
  dom.taskTitle.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addTask();
  });
  dom.taskSearch.addEventListener("input", (event) => updateSearch(event.target.value));
  dom.filterButtons.forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.filter));
  });
  dom.startBtn.addEventListener("click", startTimer);
  dom.pauseBtn.addEventListener("click", pauseTimer);
  dom.resetBtn.addEventListener("click", resetTimer);
  dom.workDuration.addEventListener("change", updateDurations);
  dom.breakDuration.addEventListener("change", updateDurations);
  dom.themeToggle.addEventListener("click", updateTheme);
}

function init() {
  loadState();
  restoreTheme();
  attachEvents();
  updateDurations();
  updateStats();
  renderTasks();
  buildHistoryChart();
  requestNotificationPermission();
}

init();
