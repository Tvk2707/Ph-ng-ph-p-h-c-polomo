import { state } from "./state.js";
import { addTask, editTask, deleteTask, toggleTaskCompleted, selectTask, setFilter, updateSearch, getFilteredTasks, moveTask, getSelectedTask } from "./task.js";
import { startTimer, pauseTimer, resetTimer, updateDurations, restoreTimerState } from "./timer.js";
import { getSavedTheme, setSavedTheme, saveState } from "./storage.js";

const dom = {
  taskTitle: document.getElementById("taskTitle"),
  taskCategory: document.getElementById("taskCategory"),
  taskDeadline: document.getElementById("taskDeadline"),
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
  feedback: document.getElementById("feedback"),
};

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
}

function showFeedback(message, type = "info") {
  dom.feedback.textContent = message;
  dom.feedback.dataset.type = type;
  dom.feedback.classList.add("show");
  window.clearTimeout(dom.feedback.dismissTimeout);
  dom.feedback.dismissTimeout = window.setTimeout(() => {
    dom.feedback.classList.remove("show");
  }, 3000);
}

function updateTimerDisplay() {
  dom.timerValue.textContent = formatTime(state.remainingSeconds);
  dom.timerLabel.textContent = state.timerMode === "work" ? "Work" : "Break";
  const selected = getSelectedTask();
  dom.selectedTaskLabel.textContent = selected ? `Focus: ${selected.title}` : "Chưa chọn task";
  const total = state.timerMode === "work" ? state.workSeconds : state.breakSeconds;
  const progress = total > 0 ? 1 - state.remainingSeconds / total : 0;
  const dashOffset = 327 - progress * 327;
  dom.progressCircle.style.strokeDashoffset = dashOffset;
}

function updateStats() {
  dom.completedTasksValue.textContent = state.tasks.filter((task) => task.completed).length;
  dom.pomodoroCountValue.textContent = state.pomodoroCount;
  dom.focusTaskValue.textContent = getSelectedTask()?.focusSessions || 0;
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
    const deadlineLabel = task.deadline ? ` • Hạn: ${task.deadline}` : "";
    meta.textContent = `${task.category} • ${task.focusSessions} phiên${deadlineLabel}`;
    checkbox.checked = task.completed;
    card.classList.toggle("selected", task.id === state.selectedTaskId);

    checkbox.addEventListener("change", () => {
      toggleTaskCompleted(task.id);
      updateStats();
      renderTasks();
    });

    focusBtn.addEventListener("click", () => {
      selectTask(task.id);
      renderTasks();
      refreshControls();
      showFeedback(`Task "${task.title}" đã được chọn để tập trung.`, "info");
    });

    editBtn.addEventListener("click", () => {
      const newTitle = prompt("Chỉnh sửa tên task", task.title);
      const newDeadline = prompt("Chỉnh sửa deadline (YYYY-MM-DD)", task.deadline || "");
      if (newTitle && newTitle.trim()) {
        editTask(task.id, newTitle, task.category, newDeadline);
        renderTasks();
      }
    });

    deleteBtn.addEventListener("click", () => {
      deleteTask(task.id);
      renderTasks();
      updateStats();
      refreshControls();
      showFeedback("Task đã xoá.", "warning");
    });

    card.addEventListener("dragstart", (event) => {
      card.classList.add("dragging");
      event.dataTransfer.setData("text/plain", task.id);
      event.dataTransfer.effectAllowed = "move";
    });

    card.addEventListener("dragend", () => card.classList.remove("dragging"));
    card.addEventListener("dragover", (event) => event.preventDefault());
    card.addEventListener("drop", (event) => {
      event.preventDefault();
      const draggedId = event.dataTransfer.getData("text/plain");
      moveTask(draggedId, task.id);
      renderTasks();
    });

    dom.taskList.appendChild(item);
  });
}

function refreshControls() {
  const canStart = Boolean(state.selectedTaskId && state.tasks.length > 0);
  dom.startBtn.disabled = !canStart;
  dom.startBtn.title = canStart ? "Bắt đầu Pomodoro" : "Chọn một task để bắt đầu";
  dom.stopBtn?.classList.toggle("disabled", !canStart);
}

function onStartClick() {
  if (!state.selectedTaskId) {
    showFeedback("Vui lòng chọn một task trước khi bắt đầu Pomodoro.", "error");
    return;
  }
  if (!startTimer()) {
    showFeedback("Không thể khởi động Pomodoro. Vui lòng thử lại.", "error");
    return;
  }
  showFeedback("Pomodoro đang chạy. Giữ vững nhịp độ!", "success");
  refreshControls();
}

function onPauseClick() {
  pauseTimer();
  showFeedback("Pomodoro tạm dừng.", "info");
  refreshControls();
}

function onResetClick() {
  resetTimer();
  showFeedback("Timer đã được đặt lại.", "info");
  refreshControls();
}

function onTaskSubmit() {
  const title = dom.taskTitle.value.trim();
  const category = dom.taskCategory.value;
  const deadline = dom.taskDeadline.value;
  dom.taskTitle.classList.remove("invalid");
  if (!title) {
    dom.taskTitle.classList.add("invalid");
    showFeedback("Tên task không được để trống.", "error");
    return;
  }
  addTask(title, category, deadline);
  dom.taskTitle.value = "";
  dom.taskDeadline.value = "";
  renderTasks();
  updateStats();
  refreshControls();
  showFeedback("Task mới đã được thêm.", "success");
}

function attachEvents() {
  dom.addTaskBtn.addEventListener("click", onTaskSubmit);
  dom.taskTitle.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      onTaskSubmit();
    }
  });
  dom.taskTitle.addEventListener("input", () => dom.taskTitle.classList.remove("invalid"));
  dom.taskSearch.addEventListener("input", (event) => {
    updateSearch(event.target.value);
    renderTasks();
  });
  dom.filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setFilter(button.dataset.filter);
      dom.filterButtons.forEach((item) => item.classList.toggle("active", item === button));
      renderTasks();
    });
  });
  dom.startBtn.addEventListener("click", onStartClick);
  dom.pauseBtn.addEventListener("click", onPauseClick);
  dom.resetBtn.addEventListener("click", onResetClick);
  dom.workDuration.addEventListener("change", () => {
    updateDurations(parseInt(dom.workDuration.value, 10), parseInt(dom.breakDuration.value, 10));
    updateTimerDisplay();
  });
  dom.breakDuration.addEventListener("change", () => {
    updateDurations(parseInt(dom.workDuration.value, 10), parseInt(dom.breakDuration.value, 10));
    updateTimerDisplay();
  });
  dom.themeToggle.addEventListener("click", toggleTheme);
}

function restoreTheme() {
  const savedTheme = getSavedTheme();
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
  }
  dom.themeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
}

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");
  dom.themeToggle.textContent = isDark ? "☀️" : "🌙";
  setSavedTheme(isDark ? "dark" : "light");
}

function notifyTimerEnd(mode) {
  const message = mode === "work" ? "Hoàn thành Pomodoro! Bắt đầu nghỉ ngơi." : "Kết thúc nghỉ, quay lại làm việc.";
  showFeedback(message, "success");
  if (Notification.permission === "granted") {
    new Notification("Time Manager", { body: message });
  }
}

function setupNotificationPermission() {
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export function initUI() {
  restoreTheme();
  attachEvents();
  renderTasks();
  updateStats();
  buildHistoryChart();
  updateTimerDisplay();
  refreshControls();
  setupNotificationPermission();
  restoreTimerState({
    onTick: () => {
      updateTimerDisplay();
      refreshControls();
    },
    onCycleComplete: () => {
      updateStats();
      buildHistoryChart();
      updateTimerDisplay();
      refreshControls();
    },
    onNotify: notifyTimerEnd,
  });
}
