export const state = {
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
  timerStartedAt: null,
};
