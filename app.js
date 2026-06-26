/* =============================================
   HÁBITOS — APP.JS
   Vanilla JS SPA · localStorage · PWA-ready
   ============================================= */

// ── Constants ────────────────────────────────────────
const STORE_KEY = 'habitos_v1';

const WEEKDAYS = ['D','L','M','X','J','V','S'];
const MONTHS   = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

const EMOJIS = [
  '🥤','🚭','🍕','🍺','🎮','📱','🍫','🧁',
  '🏃','💪','🧘','🚴','🏋','🤸','💤','🛌',
  '📚','✍️','🎸','🎨','💻','🧩','💧','🥗',
  '🫀','🌿','🍎','💊','💸','🧠','⭐','✅',
];

const COLORS = [
  '#8B5CF6','#06B6D4','#F59E0B','#10B981',
  '#EF4444','#EC4899','#3B82F6','#F97316',
];

// ── State ─────────────────────────────────────────────
const state = {
  habits: [],
  view: 'dashboard',          // 'dashboard' | 'detail'
  activeId: null,
  calYear: null,
  calMonth: null,
  newHabit: { name: '', emoji: '⭐', color: COLORS[0] },
};

let installPrompt = null;

// ── Storage ───────────────────────────────────────────
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      state.habits = Array.isArray(data.habits) ? data.habits : [];
    }
  } catch { state.habits = []; }
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ habits: state.habits })); }
  catch (e) { console.error('Save failed', e); }
}

// ── Date helpers ──────────────────────────────────────
function toStr(date) {
  const d = date || new Date();
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}
function p(n) { return String(n).padStart(2,'0'); }

function todayStr() { return toStr(new Date()); }

function getLast7() {
  const out = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push({ str: toStr(d), lbl: WEEKDAYS[d.getDay()], isToday: i === 0 });
  }
  return out;
}

function parseLocal(str) {
  const [y,m,d] = str.split('-').map(Number);
  return new Date(y, m-1, d);
}

// ── Streak calculations ───────────────────────────────
function currentStreak(completions) {
  if (!completions?.length) return 0;
  const set = new Set(completions);
  const today = todayStr();
  let date = new Date();
  if (!set.has(today)) date.setDate(date.getDate() - 1);
  let n = 0;
  while (true) {
    if (set.has(toStr(date))) { n++; date.setDate(date.getDate() - 1); }
    else break;
  }
  return n;
}

function longestStreak(completions) {
  if (!completions?.length) return 0;
  const sorted = [...completions].sort();
  let best = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (parseLocal(sorted[i]) - parseLocal(sorted[i-1])) / 86400000;
    if (diff === 1)      { cur++; best = Math.max(best, cur); }
    else if (diff > 1)   { cur = 1; }
  }
  return best;
}

function isDoneToday(habit) { return habit.completions.includes(todayStr()); }

// ── CRUD ──────────────────────────────────────────────
function createHabit(name, emoji, color) {
  const h = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    name, emoji, color,
    createdAt: todayStr(),
    completions: [],
  };
  state.habits.push(h);
  save();
  return h;
}

function toggleCompletion(id, dateStr) {
  const h = state.habits.find(x => x.id === id);
  if (!h) return;
  const idx = h.completions.indexOf(dateStr);
  if (idx >= 0) h.completions.splice(idx, 1);
  else h.completions.push(dateStr);
  save();
}

function removeHabit(id) {
  state.habits = state.habits.filter(x => x.id !== id);
  save();
}

// ── Escape ────────────────────────────────────────────
function esc(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

// ── Render: Dashboard ─────────────────────────────────
function renderDashboard() {
  const h = new Date().getHours();
  const greet = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  const last7 = getLast7();

  let html = `
    <div id="install-slot"></div>
    <header class="app-header">
      <div>
        <div class="header-eyebrow">${greet}</div>
        <div class="header-title">Mis Hábitos</div>
      </div>
    </header>
  `;

  if (!state.habits.length) {
    html += `
      <div class="empty-state pop-in">
        <div class="empty-icon">🌱</div>
        <h2>Sin hábitos todavía</h2>
        <p>Toca el botón <strong>+</strong> para crear tu primer hábito y empezar a construir racha.</p>
      </div>`;
  } else {
    html += `<div class="habits-list">`;
    state.habits.forEach(habit => {
      const streak = currentStreak(habit.completions);
      const done   = isDoneToday(habit);
      const set    = new Set(habit.completions);
      const dots   = last7.map(day => {
        const isDone  = set.has(day.str);
        let cls = 'day-dot' + (isDone ? ' done' : '') + (day.isToday ? ' is-today' : '');
        return `<div class="day-cell">
          <span class="day-lbl">${day.lbl}</span>
          <div class="${cls}"></div>
        </div>`;
      }).join('');

      html += `
        <div class="habit-card pop-in" onclick="openDetail('${habit.id}')">
          <div class="card-accent-bar" style="background:${habit.color}"></div>
          <div class="card-top">
            <div class="card-left">
              <span class="habit-emoji">${habit.emoji}</span>
              <span class="habit-name">${esc(habit.name)}</span>
            </div>
            <div class="card-right">
              <div class="streak-badge">
                <div class="streak-num ${streak > 0 ? 'active' : ''}">${streak}</div>
                <div class="streak-tag">🔥 racha</div>
              </div>
              <button class="check-btn ${done ? 'checked' : ''}"
                      onclick="event.stopPropagation(); tapCheck('${habit.id}', this)"
                      aria-label="${done ? 'Desmarcar hoy' : 'Marcar hoy'}">✓</button>
            </div>
          </div>
          <div class="days-grid">${dots}</div>
        </div>`;
    });
    html += `</div>`;
  }

  html += `<button class="fab" onclick="openAdd()" aria-label="Agregar hábito">+</button>`;
  document.getElementById('app').innerHTML = html;
  mountInstallBanner();
}

// ── Render: Detail ────────────────────────────────────
function renderDetail(id) {
  const habit = state.habits.find(h => h.id === id);
  if (!habit) { state.view = 'dashboard'; renderDashboard(); return; }

  const streak  = currentStreak(habit.completions);
  const longest = longestStreak(habit.completions);
  const total   = habit.completions.length;
  const done    = isDoneToday(habit);
  const set     = new Set(habit.completions);

  const year  = state.calYear;
  const month = state.calMonth;
  const now   = new Date();

  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const offset = first.getDay();     // 0=Sun
  const todaySt = todayStr();

  // Build calendar cells
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(d);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const sinceLabel = fmtDate(habit.createdAt);

  // Prev-month lower bound: habit creation month
  const [cy, cm] = habit.createdAt.split('-').map(Number);
  const atCreation = year < cy || (year === cy && month < cm);

  const todayNiceDate = `${now.getDate()} de ${MONTHS[now.getMonth()]}`;

  const calRows = cells.map(d => {
    if (!d) return '<div class="cal-day empty"></div>';
    const ds = `${year}-${p(month+1)}-${p(d)}`;
    const isToday  = ds === todaySt;
    const isDone   = set.has(ds);
    const isFuture = parseLocal(ds) > now;
    let cls = 'cal-day';
    if (isDone)   cls += ' done';
    if (isToday)  cls += ' today';
    if (isFuture) cls += ' future';
    return `<div class="${cls}" onclick="tapDay('${id}','${ds}')">${d}</div>`;
  }).join('');

  const html = `
    <header class="detail-header">
      <button class="back-btn" onclick="goBack()" aria-label="Volver">←</button>
      <div class="detail-meta">
        <div class="detail-name">${habit.emoji} ${esc(habit.name)}</div>
        <div class="detail-since">Desde ${sinceLabel}</div>
      </div>
      <button class="icon-btn" onclick="askDelete('${id}')" aria-label="Eliminar hábito">🗑</button>
    </header>

    <div class="stats-row fade-in">
      <div class="stat-card">
        <div class="stat-val v-accent">${streak}</div>
        <div class="stat-name">🔥 Racha</div>
      </div>
      <div class="stat-card">
        <div class="stat-val v-success">${longest}</div>
        <div class="stat-name">🏆 Mejor</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${total}</div>
        <div class="stat-name">✅ Total</div>
      </div>
    </div>

    <div class="today-card ${done ? 'is-done' : ''} fade-in">
      <div class="today-info">
        <div class="today-label">${done ? '¡Completado hoy! 💪' : 'Marcar hoy'}</div>
        <div class="today-sub">${done ? 'Sigue así, vas muy bien' : todayNiceDate}</div>
      </div>
      <button class="check-btn-lg ${done ? 'checked' : ''}"
              onclick="tapCheck('${id}', this)"
              aria-label="${done ? 'Desmarcar hoy' : 'Marcar como completado hoy'}">✓</button>
    </div>

    <div class="calendar-wrap fade-in">
      <div class="cal-nav">
        <button class="cal-nav-btn" onclick="shiftMonth(-1)" ${atCreation ? 'disabled' : ''}>‹</button>
        <div class="cal-month-label">${MONTHS[month]} ${year}</div>
        <button class="cal-nav-btn" onclick="shiftMonth(1)"  ${isCurrentMonth ? 'disabled' : ''}>›</button>
      </div>
      <div class="cal-grid">
        ${WEEKDAYS.map(w => `<div class="cal-weekday">${w}</div>`).join('')}
        ${calRows}
      </div>
    </div>
  `;

  document.getElementById('app').innerHTML = html;
}

// ── Render: Add modal ─────────────────────────────────
function renderAddModal() {
  const { emoji, color } = state.newHabit;

  const emojiGrid = EMOJIS.map(e =>
    `<button class="emoji-btn ${emoji === e ? 'selected' : ''}"
             onclick="pickEmoji('${e}')">${e}</button>`
  ).join('');

  const colorPicker = COLORS.map(c =>
    `<button class="color-swatch ${color === c ? 'selected' : ''}"
             data-color="${c}"
             style="background:${c}"
             onclick="pickColor('${c}')"></button>`
  ).join('');

  const el = document.createElement('div');
  el.className = 'overlay';
  el.id = 'add-modal';
  el.onclick = e => { if (e.target === el) closeAdd(); };
  el.innerHTML = `
    <div class="sheet">
      <div class="sheet-handle"></div>
      <h2>Nuevo hábito</h2>

      <div class="form-group">
        <label class="form-label" for="hname">Nombre</label>
        <input class="form-input" id="hname" type="text"
               placeholder="ej. No tomar refresco"
               maxlength="60"
               value="${esc(state.newHabit.name)}"
               oninput="state.newHabit.name = this.value"
               onkeydown="if(event.key==='Enter') submitAdd()" />
      </div>

      <div class="form-group">
        <label class="form-label">Emoji</label>
        <div class="emoji-grid" id="emoji-grid">${emojiGrid}</div>
      </div>

      <div class="form-group">
        <label class="form-label">Color</label>
        <div class="color-picker" id="color-picker">${colorPicker}</div>
      </div>

      <button class="btn-primary" onclick="submitAdd()">Crear hábito</button>
    </div>`;
  document.body.appendChild(el);
  setTimeout(() => document.getElementById('hname')?.focus(), 80);
}

function renderDeleteDialog(id) {
  const habit = state.habits.find(h => h.id === id);
  if (!habit) return;

  const el = document.createElement('div');
  el.className = 'overlay centered';
  el.id = 'del-modal';
  el.onclick = e => { if (e.target === el) closeDelete(); };
  el.innerHTML = `
    <div class="dialog">
      <h3>Eliminar hábito</h3>
      <p>¿Eliminar <strong>${esc(habit.name)}</strong>? Se perderá todo el historial y la racha. Esta acción no se puede deshacer.</p>
      <div class="dialog-actions">
        <button class="btn-ghost" onclick="closeDelete()">Cancelar</button>
        <button class="btn-danger" onclick="doDelete('${id}')">Eliminar</button>
      </div>
    </div>`;
  document.body.appendChild(el);
}

// ── Actions ───────────────────────────────────────────
function openDetail(id) {
  state.view    = 'detail';
  state.activeId = id;
  const now = new Date();
  state.calYear  = now.getFullYear();
  state.calMonth = now.getMonth();
  history.pushState({ view: 'detail', id }, '', `#${id}`);
  render();
}

function goBack() {
  state.view    = 'dashboard';
  state.activeId = null;
  history.pushState({ view: 'dashboard' }, '', ' ');
  render();
}

function tapCheck(id, btn) {
  toggleCompletion(id, todayStr());
  // Pulse animation on the button itself
  btn.classList.add('pulse');
  btn.addEventListener('animationend', () => btn.classList.remove('pulse'), { once: true });
  render();
}

function tapDay(id, ds) {
  if (ds > todayStr()) return;
  toggleCompletion(id, ds);
  render();
}

function shiftMonth(dir) {
  const now = new Date();
  let m = state.calMonth + dir;
  let y = state.calYear;
  if (m < 0) { m = 11; y--; }
  if (m > 11) { m = 0;  y++; }
  // Clamp to current month as max
  if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth())) return;
  state.calMonth = m;
  state.calYear  = y;
  render();
}

function openAdd() {
  state.newHabit = { name: '', emoji: '⭐', color: COLORS[0] };
  renderAddModal();
}

function closeAdd() { document.getElementById('add-modal')?.remove(); }

function pickEmoji(e) {
  state.newHabit.emoji = e;
  document.querySelectorAll('.emoji-btn').forEach(b => {
    b.classList.toggle('selected', b.textContent.trim() === e);
  });
}

function pickColor(c) {
  state.newHabit.color = c;
  document.querySelectorAll('.color-swatch').forEach(b => {
    b.classList.toggle('selected', b.dataset.color === c);
  });
}

function submitAdd() {
  const name = state.newHabit.name.trim();
  if (!name) { document.getElementById('hname')?.focus(); return; }
  createHabit(name, state.newHabit.emoji, state.newHabit.color);
  closeAdd();
  render();
}

function askDelete(id) { renderDeleteDialog(id); }
function closeDelete() { document.getElementById('del-modal')?.remove(); }
function doDelete(id) {
  removeHabit(id);
  closeDelete();
  state.view    = 'dashboard';
  state.activeId = null;
  history.replaceState({ view: 'dashboard' }, '', ' ');
  render();
}

// ── Install banner ────────────────────────────────────
function mountInstallBanner() {
  const slot = document.getElementById('install-slot');
  if (!slot || !installPrompt) return;
  slot.innerHTML = `
    <div class="install-banner">
      <p><strong>Instala Hábitos</strong> para usarla sin conexión</p>
      <button class="install-btn" onclick="triggerInstall()">Instalar</button>
    </div>`;
}

function triggerInstall() {
  if (!installPrompt) return;
  installPrompt.prompt();
  installPrompt.userChoice.then(() => {
    installPrompt = null;
    document.querySelector('.install-banner')?.remove();
  });
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installPrompt = e;
  mountInstallBanner();
});

// ── Utility ───────────────────────────────────────────
function fmtDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${parseInt(d)} ${MONTHS[parseInt(m)-1].slice(0,3)} ${y}`;
}

// ── Routing ───────────────────────────────────────────
window.addEventListener('popstate', e => {
  if (e.state?.view === 'detail' && e.state.id) {
    state.view    = 'detail';
    state.activeId = e.state.id;
    const now = new Date();
    state.calYear  = now.getFullYear();
    state.calMonth = now.getMonth();
  } else {
    state.view    = 'dashboard';
    state.activeId = null;
  }
  render();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeAdd();
    closeDelete();
    if (state.view === 'detail') goBack();
  }
});

// ── Main render ───────────────────────────────────────
function render() {
  if (state.view === 'detail' && state.activeId) renderDetail(state.activeId);
  else renderDashboard();
}

// ── Init ──────────────────────────────────────────────
function init() {
  load();

  // Check URL hash for deep link
  const hash = window.location.hash.slice(1).trim();
  if (hash && state.habits.find(h => h.id === hash)) {
    state.view    = 'detail';
    state.activeId = hash;
    const now = new Date();
    state.calYear  = now.getFullYear();
    state.calMonth = now.getMonth();
  }

  render();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err =>
      console.warn('Service Worker no registrado:', err)
    );
  }
}

init();
