import { state } from "./state.js";

const storageKey = "time-management-app-v1";
const themeKey = "theme-mode";

export function loadState() {
  const stored = localStorage.getItem(storageKey);
  if (!stored) return;
  try {
    const parsed = JSON.parse(stored);
    Object.assign(state, parsed);
    state.workSeconds = parsed.workSeconds || state.workSeconds;
    state.breakSeconds = parsed.breakSeconds || state.breakSeconds;
    state.timerMode = parsed.timerMode || state.timerMode;
    state.remainingSeconds = parsed.remainingSeconds || state.remainingSeconds;
    state.timerStartedAt = parsed.timerStartedAt || null;
  } catch (error) {
    console.warn("Không thể đọc dữ liệu localStorage", error);
  }
}

export function saveState() {
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
    timerStartedAt: state.timerStartedAt,
  };
  localStorage.setItem(storageKey, JSON.stringify(data));
}

export function getSavedTheme() {
  return localStorage.getItem(themeKey);
}

export function setSavedTheme(mode) {
  localStorage.setItem(themeKey, mode);
}
