const APP_KEY = 'stageflow-state';
const FILTER_KEY = 'stageflow-progression-filter';
const NC_ITEMS = ['25m front crawl', '25m backstroke', '10m butterfly or breaststroke', 'Water Safety Award completed'];

function loadJson(key, fallback) {
  try {
    const text = window.localStorage.getItem(key);
    return text ? JSON.parse(text) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage issues in restricted devices.
  }
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function appState() {
  return loadJson(APP_KEY, {});
}

function lessonProgramme(lesson = {}) {
  if (lesson.programme) return lesson.programme;
  const text = `${lesson.school || ''} ${lesson.name || ''} ${lesson.year || ''}`.toLowerCase();
  if (text.includes('evening')) return 'Evening Swim Lessons';
  if (text.includes('private')) return 'Private Lessons';
  if (text.includes('gym')) return 'Gymnastics';
  if (text.includes('pe')) return 'School PE';
  return 'School Swimming';
}

function stageNumber(stage) {
  const match = String(stage || '').match(/Stage\s*(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function stageSortValue(stage) {
  const number = stageNumber(stage);
  if (number) return number;
  if (String(stage || '').toLowerCase().includes('self rescue')) return 900;
  return 800;
}

function stageCriteria(state, stage) {
  return state?.framework?.criteria?.[stage] || [];
}

function stageProgress(state, learner, stage) {
  const criteria = stageCriteria(state, stage);
  const total = criteria.length;
  const passed = criteria.filter(item => learner?.res?.[item] === 'pass').length;
  const left = Math.max(0, total - passed);
  const percent = total ? Math.round((passed / total) * 100) : 0;
  const missing = criteria.filter(item => learner?.res?.[item] !== 'pass').slice(0, 4);
  return { total, passed, left, percent, missing };
}

function highestCompletedStage(state, learner) {
  const stages = [...(state?.framework?.stages || [])].filter(stage => stageNumber(stage)).sort((a, b) => stageSortValue(a) - stageSortValue(b));
  let highest = '';
  stages.forEach(stage => {
    const progress = stageProgress(state, learner, stage);
    if (progress.total && progress.left === 0) highest = stage;
  });
  return highest;
}

function nextStageAfter(state, stage) {
  const stages = [...(state?.framework?.stages || [])].filter(item => stageNumber(item)).sort((a, b) => stageSortValue(a) - stageSortValue(b));
  const index = stages.indexOf(stage);
  return index >= 0 ? stages[index + 1] || '' : '';
}

function ncProgress(learner) {
  const passed = NC_ITEMS.filter(item => !!learner?.nc?.[item]).length;
  return { passed, total: NC_ITEMS.length, percent: Math.round((passed / NC_ITEMS.length) * 100), left: NC_ITEMS.length - passed };
}

function learnerStatus(progress, nc) {
  if (progress.total && progress.left === 0) return { label: 'Ready to move up', tone: 'ready' };
  if (progress.total && progress.left <= 2) return { label: 'Nearly ready', tone: 'nearly' };
  if (progress.percent < 35 || nc.percent < 25) return { label: 'Needs support', tone: 'support' };
  return { label: 'Working on stage', tone: 'working' };
}

function buildRows(state) {
  const lessons = Array.isArray(state.lessons) ? state.lessons : [];
  const learners = Array.isArray(state.learners) ? state.learners : [];
  return learners.map(learner => {
    const lesson = lessons.find(item => item.id === learner.lesson) || {};
    const currentStage = learner.stage || state?.framework?.stages?.[0] || 'Stage 1';
    const progress = stageProgress(state, learner, currentStage);
    const completedStage = highestCompletedStage(state, learner);
    const suggestedNext = progress.left === 0 ? (nextStageAfter(state, currentStage) || 'Award complete') : currentStage;
    const nc = ncProgress(learner);
    const status = learnerStatus(progress, nc);
    return {
      learner,
      lesson,
      programme: lessonProgramme(lesson),
      school: lesson.school || 'School / Venue',
      currentStage,
      completedStage,
      suggestedNext,
      progress,
      nc,
      status
    };
  });
}

function filterOptions(rows) {
  const schools = ['All schools/venues', ...new Set(rows.map(row => row.school).filter(Boolean))];
  const programmes = ['All programmes', ...new Set(rows.map(row => row.programme).filter(Boolean))];
  const statuses = ['All statuses', 'Ready to move up', 'Nearly ready', 'Working on stage', 'Needs support'];
  return { schools, programmes, statuses };
}

function activeFilters() {
  return loadJson(FILTER_KEY, { school: 'All schools/venues', programme: 'All programmes', status: 'All statuses' });
}

function filteredRows(rows, filters) {
  return rows.filter(row =>
    (filters.school === 'All schools/venues' || row.school === filters.school) &&
    (filters.programme === 'All programmes' || row.programme === filters.programme) &&
    (filters.status === 'All statuses' || row.status.label === filters.status)
  );
}

function optionHtml(options, selected) {
  return options.map(option => `<option value="${escapeHtml(option)}" ${option === selected ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('');
}

function statusCounts(rows) {
  return rows.reduce((acc, row) => {
    acc[row.status.label] = (acc[row.status.label] || 0) + 1;
    return acc;
  }, {});
}

function missingText(row) {
  if (!row.progress.missing.length) return 'All criteria passed for current stage.';
  return row.progress.missing.map(item => `• ${escapeHtml(item)}`).join('<br>');
}

function rowHtml(row) {
  return `
    <div class="progression-row ${row.status.tone}">
      <div class="progression-main">
        <strong>${escapeHtml(row.learner.name)}</strong>
        <small>${escapeHtml(row.school)} · ${escapeHtml(row.programme)} · ${escapeHtml(row.lesson.name || 'Lesson')}</small>
      </div>
      <div class="progression-badges">
        <span>${escapeHtml(row.status.label)}</span>
        <span>${escapeHtml(row.currentStage)}</span>
        <span>${row.progress.passed}/${row.progress.total || 0} passed</span>
        <span>NC ${row.nc.passed}/${row.nc.total}</span>
      </div>
      <div class="progression-bar"><i style="width:${row.progress.percent}%"></i></div>
      <div class="progression-detail">
        <div><strong>Suggested next:</strong> ${escapeHtml(row.suggestedNext)}</div>
        <div><strong>Highest complete:</strong> ${escapeHtml(row.completedStage || 'Not completed yet')}</div>
        <div><strong>Remaining focus:</strong><br>${missingText(row)}</div>
      </div>
    </div>
  `;
}

function buildPanel() {
  const state = appState();
  const rows = buildRows(state);
  const filters = activeFilters();
  const options = filterOptions(rows);
  if (!options.schools.includes(filters.school)) filters.school = 'All schools/venues';
  if (!options.programmes.includes(filters.programme)) filters.programme = 'All programmes';
  if (!options.statuses.includes(filters.status)) filters.status = 'All statuses';
  const visible = filteredRows(rows, filters);
  const counts = statusCounts(rows);
  return `
    <section class="card progression-panel" data-progression-dashboard>
      <h2>Learner progression dashboard</h2>
      <p class="muted">Review who is ready to move up, who is nearly ready, and who needs more support before reports or certificates are sent.</p>
      <div class="progression-stats">
        <div class="progression-stat">${rows.length}<small>Total learners</small></div>
        <div class="progression-stat">${counts['Ready to move up'] || 0}<small>Ready to move up</small></div>
        <div class="progression-stat">${counts['Nearly ready'] || 0}<small>Nearly ready</small></div>
        <div class="progression-stat">${counts['Needs support'] || 0}<small>Needs support</small></div>
      </div>
      <div class="progression-filters">
        <label>School / venue<select data-progression-filter="school">${optionHtml(options.schools, filters.school)}</select></label>
        <label>Programme<select data-progression-filter="programme">${optionHtml(options.programmes, filters.programme)}</select></label>
        <label>Status<select data-progression-filter="status">${optionHtml(options.statuses, filters.status)}</select></label>
      </div>
      ${visible.length ? visible.map(rowHtml).join('') : '<div class="progression-row"><strong>No learners match these filters.</strong><small>Change the school/programme/status filter.</small></div>'}
    </section>
  `;
}

function addStyles() {
  if (document.getElementById('stageflow-progression-style')) return;
  const style = document.createElement('style');
  style.id = 'stageflow-progression-style';
  style.textContent = `
    .progression-panel{border-top:5px solid #2563eb}
    .progression-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:10px 0}
    .progression-stat{border:1px solid #d9dee8;background:#f8fafc;border-radius:5px;padding:10px;font-weight:1000}
    .progression-stat small{display:block;color:#64748b;margin-top:3px}
    .progression-filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin:10px 0}
    .progression-filters label{display:grid;gap:5px}
    .progression-row{border:1px solid #d9dee8;border-left:5px solid #64748b;border-radius:5px;background:#fff;padding:10px;margin-top:8px}
    .progression-row.ready{border-left-color:#16a34a}
    .progression-row.nearly{border-left-color:#f97316}
    .progression-row.support{border-left-color:#dc2626}
    .progression-row.working{border-left-color:#2563eb}
    .progression-main strong{display:block}
    .progression-main small{display:block;color:#64748b;font-weight:800;margin-top:3px}
    .progression-badges{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}
    .progression-badges span{border:1px solid #d9dee8;background:#f8fafc;border-radius:999px;padding:4px 8px;font-size:12px;font-weight:1000}
    .progression-bar{height:9px;background:#e5e7eb;border-radius:999px;overflow:hidden;margin-top:8px}
    .progression-bar i{display:block;height:100%;background:linear-gradient(90deg,#2563eb,#f97316);border-radius:999px}
    .progression-detail{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-top:8px;color:#334155;font-weight:800}
    .progression-detail strong{color:#0f172a}
  `;
  document.head.appendChild(style);
}

function mountProgressionDashboard() {
  addStyles();
  const reportHero = Array.from(document.querySelectorAll('.hero h1')).find(h => h.textContent.trim() === 'End-of-Term Pack');
  const main = document.querySelector('main');
  if (!reportHero || !main) return;
  const old = main.querySelector('[data-progression-dashboard]');
  if (old) old.remove();
  const firstGrid = main.querySelector('.grid2');
  if (firstGrid) firstGrid.insertAdjacentHTML('afterend', buildPanel());
  else main.insertAdjacentHTML('beforeend', buildPanel());
  const panel = main.querySelector('[data-progression-dashboard]');
  panel?.addEventListener('change', event => {
    const select = event.target.closest('[data-progression-filter]');
    if (!select) return;
    const filters = activeFilters();
    filters[select.getAttribute('data-progression-filter')] = select.value;
    saveJson(FILTER_KEY, filters);
    mountProgressionDashboard();
  });
}

let scheduled = false;
function scheduleMount() {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(() => {
    scheduled = false;
    mountProgressionDashboard();
  }, 100);
}

window.addEventListener('load', scheduleMount);
new MutationObserver(scheduleMount).observe(document.documentElement, { childList: true, subtree: true });
