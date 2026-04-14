import { state } from "./state.js";
import { saveState } from "./storage.js";

function createId() {
  if (typeof crypto === "object" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

export function getSelectedTask() {
  return state.tasks.find((task) => task.id === state.selectedTaskId) || null;
}

export function addTask(title, category, deadline) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return false;
  }
  state.tasks.unshift({
    id: createId(),
    title: trimmedTitle,
    category,
    completed: false,
    focusSessions: 0,
    createdAt: Date.now(),
    deadline: deadline || "",
  });
  saveState();
  return true;
}

export function editTask(id, newTitle, newCategory, newDeadline) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return false;
  task.title = newTitle.trim() || task.title;
  task.category = newCategory || task.category;
  task.deadline = newDeadline || task.deadline;
  saveState();
  return true;
}

export function deleteTask(id) {
  state.tasks = state.tasks.filter((task) => task.id !== id);
  if (state.selectedTaskId === id) {
    state.selectedTaskId = null;
  }
  saveState();
}

export function toggleTaskCompleted(id) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveState();
}

export function selectTask(id) {
  const taskExists = state.tasks.some((task) => task.id === id);
  state.selectedTaskId = taskExists ? id : null;
  saveState();
}

export function setFilter(filter) {
  state.filter = filter;
  saveState();
}

export function updateSearch(term) {
  state.searchTerm = term;
}

export function getFilteredTasks() {
  return state.tasks
    .filter((task) => {
      if (state.filter === "completed") return task.completed;
      if (state.filter === "pending") return !task.completed;
      return true;
    })
    .filter((task) => task.title.toLowerCase().includes(state.searchTerm.toLowerCase()));
}

export function moveTask(draggedId, targetId) {
  const draggedIndex = state.tasks.findIndex((task) => task.id === draggedId);
  const targetIndex = state.tasks.findIndex((task) => task.id === targetId);
  if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;
  const [draggedItem] = state.tasks.splice(draggedIndex, 1);
  state.tasks.splice(targetIndex, 0, draggedItem);
  saveState();
}
