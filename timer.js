import { state } from "./state.js";
import { saveState } from "./storage.js";
import { getSelectedTask } from "./task.js";

let timerInterval = null;
let callbacks = {
  onTick: () => {},
  onCycleComplete: () => {},
  onNotify: () => {},
};

function clearTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function applyElapsed(elapsedSeconds) {
  if (elapsedSeconds <= 0) return;
  while (elapsedSeconds >= state.remainingSeconds) {
    elapsedSeconds -= state.remainingSeconds;
    processCycle();
  }
  state.remainingSeconds = Math.max(0, state.remainingSeconds - elapsedSeconds);
}

function processCycle() {
  if (state.timerMode === "work") {
    state.pomodoroCount += 1;
    const today = new Date().toISOString().slice(0, 10);
    state.history[today] = (state.history[today] || 0) + 1;
    const selected = getSelectedTask();
    if (selected) {
      selected.focusSessions += 1;
    }
  }
  state.timerMode = state.timerMode === "work" ? "break" : "work";
  state.remainingSeconds = state.timerMode === "work" ? state.workSeconds : state.breakSeconds;
}

function tick() {
  if (state.remainingSeconds <= 0) {
    callbacks.onNotify(state.timerMode);
    processCycle();
    saveState();
    callbacks.onCycleComplete();
    state.timerStartedAt = Date.now();
    return;
  }
  state.remainingSeconds -= 1;
  saveState();
  callbacks.onTick();
}

export function restoreTimerState({ onTick, onCycleComplete, onNotify }) {
  callbacks = { onTick, onCycleComplete, onNotify };
  if (!state.isRunning) {
    return;
  }
  if (!state.selectedTaskId) {
    state.isRunning = false;
    state.timerStartedAt = null;
    saveState();
    return;
  }
  const elapsed = state.timerStartedAt ? Math.floor((Date.now() - state.timerStartedAt) / 1000) : 0;
  applyElapsed(elapsed);
  state.timerStartedAt = Date.now();
  saveState();
  startTimer();
}

export function startTimer() {
  if (state.isRunning) return true;
  if (!state.selectedTaskId) return false;
  state.isRunning = true;
  state.timerStartedAt = Date.now();
  clearTimer();
  timerInterval = setInterval(tick, 1000);
  saveState();
  callbacks.onTick();
  return true;
}

export function pauseTimer() {
  if (!state.isRunning) return;
  state.isRunning = false;
  state.timerStartedAt = null;
  clearTimer();
  saveState();
}

export function resetTimer() {
  pauseTimer();
  state.remainingSeconds = state.timerMode === "work" ? state.workSeconds : state.breakSeconds;
  saveState();
  callbacks.onTick();
}

export function updateDurations(workMinutes, breakMinutes) {
  state.workSeconds = Math.max(1, workMinutes) * 60;
  state.breakSeconds = Math.max(1, breakMinutes) * 60;
  if (!state.isRunning) {
    state.remainingSeconds = state.timerMode === "work" ? state.workSeconds : state.breakSeconds;
  }
  saveState();
}

export function isTimerRunning() {
  return state.isRunning;
}
