// ===== Constants =====
const STORAGE_KEY = 'todoapp_tasks';

// ===== State =====
let tasks = [];
let currentFilter = 'all';
let editingTaskId = null;

// ===== Utility Functions =====
function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ===== Storage Functions =====
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTasks(taskArray) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(taskArray));
}

// ===== Data Functions =====
function addTask(title, description, category) {
  const now = new Date().toISOString();
  const task = {
    id: generateId(),
    title: title.trim(),
    description: description.trim(),
    category,
    completed: false,
    createdAt: now,
    updatedAt: now,
  };
  tasks.push(task);
  saveTasks(tasks);
  return task;
}

function updateTask(id, changes) {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;
  tasks[index] = { ...tasks[index], ...changes, updatedAt: new Date().toISOString() };
  saveTasks(tasks);
  return tasks[index];
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks(tasks);
  return tasks;
}

function toggleComplete(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  updateTask(id, { completed: !task.completed });
}

// ===== Progress Rendering =====
function renderProgress() {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const overallPct = total === 0 ? 0 : Math.round((completed / total) * 100);

  document.getElementById('progress-overall-text').textContent =
    `${completed} / ${total} (${overallPct}%)`;
  document.getElementById('progress-overall-bar').style.width = `${overallPct}%`;

  ['work', 'personal', 'study'].forEach((cat) => {
    const catTasks = tasks.filter((t) => t.category === cat);
    const catCompleted = catTasks.filter((t) => t.completed).length;
    const catTotal = catTasks.length;
    const catPct = catTotal === 0 ? 0 : Math.round((catCompleted / catTotal) * 100);

    document.getElementById(`progress-${cat}-text`).textContent =
      `${catCompleted} / ${catTotal}`;
    document.getElementById(`progress-${cat}-bar`).style.width = `${catPct}%`;
  });
}

// ===== Task List Rendering =====
function renderTasks(filter) {
  currentFilter = filter || currentFilter;
  const list = document.getElementById('task-list');

  const filtered = currentFilter === 'all'
    ? tasks
    : tasks.filter((t) => t.category === currentFilter);

  if (filtered.length === 0) {
    const msg = tasks.length === 0
      ? 'No tasks yet. Add your first task!'
      : 'No tasks in this category.';
    list.innerHTML = `
      <li class="empty-state">
        <div class="empty-state-icon">📋</div>
        <p class="empty-state-text">${msg}</p>
      </li>`;
    return;
  }

  list.innerHTML = filtered.map((task) => `
    <li class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
      <input
        type="checkbox"
        class="task-checkbox"
        ${task.completed ? 'checked' : ''}
        data-action="toggle"
        data-id="${task.id}"
        aria-label="Mark complete"
      />
      <div class="task-body">
        <div class="task-title">${escapeHtml(task.title)}</div>
        ${task.description
          ? `<div class="task-description">${escapeHtml(task.description)}</div>`
          : ''}
        <div class="task-meta">
          <span class="category-badge category-${task.category}">
            ${capitalizeFirst(task.category)}
          </span>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-icon btn-edit" data-action="edit" data-id="${task.id}" title="Edit">✏️</button>
        <button class="btn-icon btn-delete" data-action="delete" data-id="${task.id}" title="Delete">🗑️</button>
      </div>
    </li>
  `).join('');

  renderProgress();
}

// ===== Helpers =====
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function highlightTask(id) {
  const el = document.querySelector(`.task-item[data-id="${id}"]`);
  if (!el) return;
  el.classList.remove('highlight');
  void el.offsetWidth; // reflow to restart animation
  el.classList.add('highlight');
}

// ===== Toast =====
let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ===== Modal =====
function openModal(mode, task = null) {
  const backdrop = document.getElementById('modal-backdrop');
  const titleEl = document.getElementById('modal-title');
  const inputTitle = document.getElementById('input-title');
  const inputDesc = document.getElementById('input-description');
  const inputCat = document.getElementById('input-category');

  editingTaskId = mode === 'edit' && task ? task.id : null;
  titleEl.textContent = mode === 'edit' ? 'Edit Task' : 'Add Task';

  inputTitle.value = task ? task.title : '';
  inputDesc.value = task ? task.description : '';
  inputCat.value = task ? task.category : 'work';

  clearFormErrors();
  backdrop.classList.add('open');
  inputTitle.focus();
}

function closeModal() {
  document.getElementById('modal-backdrop').classList.remove('open');
  editingTaskId = null;
  clearFormErrors();
}

function clearFormErrors() {
  const inputTitle = document.getElementById('input-title');
  const errorTitle = document.getElementById('error-title');
  inputTitle.classList.remove('invalid');
  errorTitle.textContent = '';
}

// ===== Form Submission =====
function handleFormSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('input-title').value;
  const description = document.getElementById('input-description').value;
  const category = document.getElementById('input-category').value;

  // Validation
  if (!title.trim()) {
    const inputTitle = document.getElementById('input-title');
    const errorTitle = document.getElementById('error-title');
    inputTitle.classList.add('invalid');
    errorTitle.textContent = 'Title is required.';
    inputTitle.focus();
    return;
  }

  if (editingTaskId) {
    updateTask(editingTaskId, {
      title: title.trim(),
      description: description.trim(),
      category,
    });
    closeModal();
    renderTasks();
    renderProgress();
    highlightTask(editingTaskId);
    showToast('Task updated.');
  } else {
    const newTask = addTask(title, description, category);
    closeModal();
    renderTasks();
    renderProgress();
    highlightTask(newTask.id);
    showToast('Task added successfully.');
  }
}

// ===== Event Delegation for Task List =====
function handleTaskListClick(e) {
  const action = e.target.dataset.action;
  const id = e.target.dataset.id;
  if (!action || !id) return;

  if (action === 'toggle') {
    toggleComplete(id);
    renderTasks();
    renderProgress();
    return;
  }

  if (action === 'edit') {
    const task = tasks.find((t) => t.id === id);
    if (task) openModal('edit', task);
    return;
  }

  if (action === 'delete') {
    if (!confirm('Delete this task?')) return;
    deleteTask(id);
    renderTasks();
    renderProgress();
    showToast('Task deleted.');
  }
}

// ===== Filter Buttons =====
function handleFilterClick(e) {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;

  document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  renderTasks(btn.dataset.filter);
}

// ===== Keyboard / Backdrop Dismiss =====
function handleBackdropClick(e) {
  if (e.target === document.getElementById('modal-backdrop')) {
    closeModal();
  }
}

function handleKeyDown(e) {
  if (e.key === 'Escape') closeModal();
}

// ===== Initialization =====
function init() {
  tasks = loadTasks();
  renderTasks();
  renderProgress();

  // Add task button
  document.getElementById('btn-add-task').addEventListener('click', () => openModal('add'));

  // Form
  document.getElementById('task-form').addEventListener('submit', handleFormSubmit);
  document.getElementById('btn-cancel').addEventListener('click', closeModal);

  // Task list delegation
  document.getElementById('task-list').addEventListener('click', handleTaskListClick);
  document.getElementById('task-list').addEventListener('change', handleTaskListClick);

  // Filter bar
  document.querySelector('.filter-bar').addEventListener('click', handleFilterClick);

  // Modal backdrop click + ESC key
  document.getElementById('modal-backdrop').addEventListener('click', handleBackdropClick);
  document.addEventListener('keydown', handleKeyDown);

  // Inline validation: clear error on input
  document.getElementById('input-title').addEventListener('input', () => {
    document.getElementById('input-title').classList.remove('invalid');
    document.getElementById('error-title').textContent = '';
  });
}

document.addEventListener('DOMContentLoaded', init);
