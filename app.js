/* =============================================
   HÁBITOS — APP.JS  v2
   Vanilla JS SPA · localStorage · PWA-ready
   Custom frequency per habit (days of week)
   ============================================= */

// ── Constants ─────────────────────────────────────────
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

const ALL_DAYS = [0,1,2,3,4,5,6];

// ── State ──────────────────────────────────────────────
const state = {
  habits: [],
  view: 'dashboard',
  activeId: null,
  calYear: null,
  calMonth: null,
  newHabit: { name: '', emoji: '⭐', color: COLORS[0], days: [...ALL_DAYS] },
};

let installPrompt = null;

// ── Storage ────────────────────────────────────────────
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      state.habits = Array.isArray(data.habits) ? data.habits : [];
      // Migrate: habits without days default to daily
      state.habits.forEach(h => {
        if (!h.days) h.days = [...ALL_DAYS];
      });
    }
  } catch { state.habits = []; }
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ habits: state.habits })); }
  catch (e) { console.error('Save failed', e); }
}

// ── Date helpers ───────────────────────────────────────
function p(n) { return String(n).padStart(2, '0'); }
function toStr(date) {
  return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}`;
}
function todayStr() { return toStr(new Date()); }
function parseL(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m-1, d);
}
function fmtDate(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${parseInt(d)} ${MONTHS[parseInt(m)-1].slice(0,3)} ${y}`;
}

// ── Frequency helpers ──────────────────────────────────
function isScheduledToday(habit) {
  return (habit.days || ALL_DAYS).includes(new Date().getDay());
}

function isScheduledOn(habit, dateOrStr) {
  const d = typeof dateOrStr === 'string' ? parseL(dateOrStr) : dateOrStr;
  return (habit.days || ALL_DAYS).includes(d.getDay());
}

function daysLabel(days) {
  if (!days || days.length === 7) return 'Todos los días';
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 5 && sorted.every(d => d >= 1 && d <= 5)) return 'Lun — Vie';
  if (sorted.length === 2 && sorted[0] === 0 && sorted[1] === 6) return 'Fines de semana';
  return sorted.map(d => WEEKDAYS[d]).join(' · ');
}

// ── Streak calculations ────────────────────────────────
// Walks backwards from today counting consecutive SCHEDULED completions
function currentStreak(habit) {
  const days = habit.days || ALL_DAYS;
  const set  = new Set(habit.completions || []);
  const created = parseL(habit.createdAt);
  const today = new Date();
  const td = todayStr();

  let date    = new Date(today);
  let streak  = 0;
  let started = false;
  let safety  = 0;

  while (date >= created && safety < 500) {
    const dow = date.getDay();
    const ds  = toStr(date);

    if (days.includes(dow)) {
      const isToday = ds === td;
      const done    = set.has(ds);

      if (!started) {
        started = true;
        if (done) {
          streak++;
        } else if (isToday) {
          // today is scheduled but not done yet — look at previous scheduled days
        } else {
          break; // last scheduled day was missed
        }
      } else {
        if (done) streak++;
        else break;
      }
    }

    date.setDate(date.getDate() - 1);
    safety++;
  }

  return streak;
}

// Scans forward from creation date to today, max consecutive scheduled hits
function bestStreak(habit) {
  const days = habit.days || ALL_DAYS;
  const set  = new Set(habit.completions || []);
  const created = parseL(habit.createdAt);
  const today   = new Date();

  let best = 0, cur = 0;
  const d = new Date(created);

  while (d <= today) {
    if (days.includes(d.getDay())) {
      if (set.has(toStr(d))) { cur++; if (cur > best) best = cur; }
      else cur = 0;
    }
    d.setDate(d.getDate() + 1);
  }

  return best;
}

function isDoneToday(habit)  { return habit.completions.includes(todayStr()); }

// ── CRUD ───────────────────────────────────────────────
function createHabit(name, emoji, color, days) {
  const h = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    name, emoji, color,
    days: [...days],
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

// ── Helpers ────────────────────────────────────────────
function esc(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

// ── Render: Dashboard ──────────────────────────────────
function renderDashboard() {
  const hour   = new Date().getHours();
  const greet  = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const today  = new Date();
  const todoDOW = today.getDay();

  // Build last-7-days metadata
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last7.push({ str: toStr(d), lbl: WEEKDAYS[d.getDay()], dow: d.getDay(), isToday: i === 0 });
  }

  let html = `
    <div id="install-slot"></div>
    <header class="app-header">
      <div>
        <div class="header-eyebrow">${greet}</div>
        <div class="header-title">Mis Hábitos</div>
      </div>
    </header>`;

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
      const streak    = currentStreak(habit);
      const done      = isDoneToday(habit);
      const todaySch  = isScheduledToday(habit);
      const set       = new Set(habit.completions);
      const days      = habit.days || ALL_DAYS;
      const freqLabel = daysLabel(days);
      const isDaily   = days.length === 7;

      const dots = last7.map(day => {
        const scheduled = days.includes(day.dow);
        const isDone    = set.has(day.str);

        if (!scheduled) {
          // Rest / non-scheduled day — show a dash
          return `<div class="day-cell">
            <span class="day-lbl">${day.lbl}</span>
            <div class="day-dot rest"></div>
          </div>`;
        }

        let cls = 'day-dot' + (isDone ? ' done' : '') + (day.isToday ? ' is-today' : '');
        return `<div class="day-cell">
          <span class="day-lbl">${day.lbl}</span>
          <div class="${cls}"></div>
        </div>`;
      }).join('');

      const checkBtn = todaySch
        ? `<button class="check-btn ${done ? 'checked' : ''}"
                   onclick="event.stopPropagation(); tapCheck('${habit.id}', this)"
                   aria-label="${done ? 'Desmarcar hoy' : 'Marcar hoy'}">✓</button>`
        : `<div class="rest-indicator" title="Día de descanso">🛌</div>`;

      const freqSub = !isDaily
        ? `<span class="habit-freq">${freqLabel}</span>`
        : '';

      html += `
        <div class="habit-card pop-in" onclick="openDetail('${habit.id}')">
          <div class="card-accent-bar" style="background:${habit.color}"></div>
          <div class="card-top">
            <div class="card-left">
              <span class="habit-emoji">${habit.emoji}</span>
              <div class="habit-name-wrap">
                <span class="habit-name">${esc(habit.name)}</span>
                ${freqSub}
              </div>
            </div>
            <div class="card-right">
              <div class="streak-badge">
                <div class="streak-num ${streak > 0 ? 'active' : ''}">${streak}</div>
                <div class="streak-tag">🔥 racha</div>
              </div>
              ${checkBtn}
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

// ── Render: Detail ─────────────────────────────────────
function renderDetail(id) {
  const habit = state.habits.find(h => h.id === id);
  if (!habit) { state.view = 'dashboard'; renderDashboard(); return; }

  const days      = habit.days || ALL_DAYS;
  const streak    = currentStreak(habit);
  const best      = bestStreak(habit);
  const total     = habit.completions.length;
  const done      = isDoneToday(habit);
  const todaySch  = isScheduledToday(habit);
  const set       = new Set(habit.completions);
  const freqLabel = daysLabel(days);

  const year  = state.calYear;
  const month = state.calMonth;
  const now   = new Date();
  const td    = todayStr();

  const first  = new Date(year, month, 1);
  const last   = new Date(year, month + 1, 0);
  const offset = first.getDay();

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(d);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const [cy, cm] = habit.createdAt.split('-').map(Number);
  const atCreation = year < cy || (year === cy && month < cm);

  const calRows = cells.map(d => {
    if (!d) return '<div class="cal-day empty"></div>';
    const ds = `${year}-${p(month+1)}-${p(d)}`;
    const cellDate   = new Date(year, month, d);
    const isToday    = ds === td;
    const isDone     = set.has(ds);
    const isFuture   = cellDate > now;
    const isSched    = days.includes(cellDate.getDay());

    let cls = 'cal-day';
    if (!isSched)  { cls += ' no-sched'; return `<div class="${cls}">${d}</div>`; }
    if (isDone)    cls += ' done';
    if (isToday)   cls += ' today';
    if (isFuture)  cls += ' future';

    return `<div class="${cls}" onclick="tapDay('${id}','${ds}')">${d}</div>`;
  }).join('');

  // Today section — different if not scheduled
  const todayNice = `${now.getDate()} de ${MONTHS[now.getMonth()]}`;
  const todaySection = todaySch
    ? `<div class="today-card ${done ? 'is-done' : ''} fade-in">
        <div class="today-info">
          <div class="today-label">${done ? '¡Completado hoy! 💪' : 'Marcar hoy'}</div>
          <div class="today-sub">${done ? 'Sigue así, vas muy bien' : todayNice}</div>
        </div>
        <button class="check-btn-lg ${done ? 'checked' : ''}"
                onclick="tapCheck('${id}', this)"
                aria-label="${done ? 'Desmarcar hoy' : 'Marcar como completado hoy'}">✓</button>
      </div>`
    : `<div class="today-card rest-day fade-in">
        <div class="today-info">
          <div class="today-label">Día de descanso 🛌</div>
          <div class="today-sub">Este hábito no aplica hoy (${WEEKDAYS[now.getDay()]})</div>
        </div>
      </div>`;

  const html = `
    <header class="detail-header">
      <button class="back-btn" onclick="goBack()" aria-label="Volver">←</button>
      <div class="detail-meta">
        <div class="detail-name">${habit.emoji} ${esc(habit.name)}</div>
        <div class="detail-since">${freqLabel} · Desde ${fmtDate(habit.createdAt)}</div>
      </div>
      <button class="icon-btn" onclick="askDelete('${id}')" aria-label="Eliminar hábito">🗑</button>
    </header>

    <div class="stats-row fade-in">
      <div class="stat-card">
        <div class="stat-val v-accent">${streak}</div>
        <div class="stat-name">🔥 Racha</div>
      </div>
      <div class="stat-card">
        <div class="stat-val v-success">${best}</div>
        <div class="stat-name">🏆 Mejor</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${total}</div>
        <div class="stat-name">✅ Total</div>
      </div>
    </div>

    ${todaySection}

    <div class="calendar-wrap fade-in">
      <div class="cal-nav">
        <button class="cal-nav-btn" onclick="shiftMonth(-1)" ${atCreation ? 'disabled' : ''}>‹</button>
        <div class="cal-month-label">${MONTHS[month]} ${year}</div>
        <button class="cal-nav-btn" onclick="shiftMonth(1)"  ${isCurrentMonth ? 'disabled' : ''}>›</button>
      </div>

      <div class="cal-legend">
        ${days.map(d => `<span class="cal-legend-chip">${WEEKDAYS[d]}</span>`).join('')}
      </div>

      <div class="cal-grid">
        ${WEEKDAYS.map(w => `<div class="cal-weekday">${w}</div>`).join('')}
        ${calRows}
      </div>
    </div>`;

  document.getElementById('app').innerHTML = html;
}

// ── Render: Add modal ──────────────────────────────────
function renderAddModal() {
  const { emoji, color, days } = state.newHabit;

  const isCustomEmoji = !EMOJIS.includes(emoji);

  const emojiGrid = EMOJIS.map(e =>
    `<button class="emoji-btn ${emoji === e ? 'selected' : ''}" data-emoji="${e}"
             onclick="pickEmoji('${e}')">${e}</button>`
  ).join('') + `
    <input type="text" id="custom-emoji-input"
           class="emoji-btn custom-emoji-input ${isCustomEmoji ? 'selected' : ''}"
           placeholder="➕" maxlength="20" autocomplete="off" autocorrect="off"
           spellcheck="false" inputmode="text"
           value="${isCustomEmoji ? esc(emoji) : ''}"
           aria-label="Elegir otro emoji desde el teclado del sistema"
           oninput="pickCustomEmoji(this.value)" />`;

  const colorPicker = COLORS.map(c =>
    `<button class="color-swatch ${color === c ? 'selected' : ''}"
             data-color="${c}" style="background:${c}"
             onclick="pickColor('${c}')"></button>`
  ).join('');

  const dayPicker = WEEKDAYS.map((name, i) =>
    `<button class="day-pick-btn ${days.includes(i) ? 'selected' : ''}"
             data-day="${i}"
             onclick="pickDay(${i})">${name}</button>`
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
        <label class="form-label">Frecuencia semanal</label>
        <div class="day-picker" id="day-picker">${dayPicker}</div>
        <div class="freq-shortcuts">
          <button class="freq-shortcut" onclick="setFreqPreset('all')">Todos</button>
          <button class="freq-shortcut" onclick="setFreqPreset('weekdays')">Lun–Vie</button>
          <button class="freq-shortcut" onclick="setFreqPreset('weekend')">Fin de semana</button>
        </div>
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

// ── Actions ────────────────────────────────────────────
function openDetail(id) {
  state.view     = 'detail';
  state.activeId = id;
  const now = new Date();
  state.calYear  = now.getFullYear();
  state.calMonth = now.getMonth();
  history.pushState({ view: 'detail', id }, '', `#${id}`);
  render();
}

function goBack() {
  state.view     = 'dashboard';
  state.activeId = null;
  history.pushState({ view: 'dashboard' }, '', ' ');
  render();
}

function tapCheck(id, btn) {
  toggleCompletion(id, todayStr());
  btn.classList.add('pulse');
  btn.addEventListener('animationend', () => btn.classList.remove('pulse'), { once: true });
  render();
}

function tapDay(id, ds) {
  if (ds > todayStr()) return;
  const habit = state.habits.find(h => h.id === id);
  if (!habit || !isScheduledOn(habit, ds)) return; // can't mark non-scheduled days
  toggleCompletion(id, ds);
  render();
}

function shiftMonth(dir) {
  const now = new Date();
  let m = state.calMonth + dir;
  let y = state.calYear;
  if (m < 0)  { m = 11; y--; }
  if (m > 11) { m = 0;  y++; }
  if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth())) return;
  state.calMonth = m;
  state.calYear  = y;
  render();
}

function openAdd() {
  state.newHabit = { name: '', emoji: '⭐', color: COLORS[0], days: [...ALL_DAYS] };
  renderAddModal();
}

function closeAdd() { document.getElementById('add-modal')?.remove(); }

function pickEmoji(e) {
  state.newHabit.emoji = e;
  document.querySelectorAll('.emoji-btn[data-emoji]').forEach(b =>
    b.classList.toggle('selected', b.dataset.emoji === e)
  );
  const custom = document.getElementById('custom-emoji-input');
  if (custom) { custom.value = ''; custom.classList.remove('selected'); }
}

// Grab the last emoji/grapheme the user typed or pasted from the
// system emoji keyboard (handles skin tones, ZWJ sequences, etc.)
function pickCustomEmoji(raw) {
  if (!raw) return;
  let val = raw;
  try {
    if (window.Intl && Intl.Segmenter) {
      const seg = new Intl.Segmenter('es', { granularity: 'grapheme' });
      const parts = Array.from(seg.segment(raw), s => s.segment);
      val = parts[parts.length - 1] || raw;
    } else {
      const arr = Array.from(raw); // basic surrogate-pair-safe fallback
      val = arr[arr.length - 1] || raw;
    }
  } catch { /* keep raw value on any segmentation error */ }

  state.newHabit.emoji = val;
  document.querySelectorAll('.emoji-btn[data-emoji]').forEach(b => b.classList.remove('selected'));

  const input = document.getElementById('custom-emoji-input');
  if (input) {
    input.value = val;
    input.classList.add('selected');
  }
}

function pickColor(c) {
  state.newHabit.color = c;
  document.querySelectorAll('.color-swatch').forEach(b =>
    b.classList.toggle('selected', b.dataset.color === c)
  );
}

function pickDay(dayNum) {
  const days = state.newHabit.days;
  const idx  = days.indexOf(dayNum);
  if (idx >= 0) {
    if (days.length === 1) return; // must keep at least 1 day
    days.splice(idx, 1);
  } else {
    days.push(dayNum);
  }
  document.querySelectorAll('.day-pick-btn').forEach(b =>
    b.classList.toggle('selected', state.newHabit.days.includes(parseInt(b.dataset.day)))
  );
}

function setFreqPreset(preset) {
  const map = {
    all:      [0,1,2,3,4,5,6],
    weekdays: [1,2,3,4,5],
    weekend:  [0,6],
  };
  state.newHabit.days = [...(map[preset] || ALL_DAYS)];
  document.querySelectorAll('.day-pick-btn').forEach(b =>
    b.classList.toggle('selected', state.newHabit.days.includes(parseInt(b.dataset.day)))
  );
}

function submitAdd() {
  const name = state.newHabit.name.trim();
  if (!name) { document.getElementById('hname')?.focus(); return; }
  if (!state.newHabit.days.length) { return; } // safety check
  createHabit(name, state.newHabit.emoji, state.newHabit.color, state.newHabit.days);
  closeAdd();
  render();
}

function askDelete(id)  { renderDeleteDialog(id); }
function closeDelete()  { document.getElementById('del-modal')?.remove(); }
function doDelete(id)   {
  removeHabit(id);
  closeDelete();
  state.view     = 'dashboard';
  state.activeId = null;
  history.replaceState({ view: 'dashboard' }, '', ' ');
  render();
}

// ── Install banner ─────────────────────────────────────
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

// ── Routing ────────────────────────────────────────────
window.addEventListener('popstate', e => {
  if (e.state?.view === 'detail' && e.state.id) {
    state.view     = 'detail';
    state.activeId = e.state.id;
    const now = new Date();
    state.calYear  = now.getFullYear();
    state.calMonth = now.getMonth();
  } else {
    state.view     = 'dashboard';
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

// ── Main render ────────────────────────────────────────
function render() {
  if (state.view === 'detail' && state.activeId) renderDetail(state.activeId);
  else renderDashboard();
}

// ── Init ───────────────────────────────────────────────
function init() {
  load();
  const hash = window.location.hash.slice(1).trim();
  if (hash && state.habits.find(h => h.id === hash)) {
    state.view     = 'detail';
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
