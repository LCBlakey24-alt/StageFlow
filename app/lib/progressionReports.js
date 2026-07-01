const APP_KEY = 'stageflow-state';
const FILTER_KEY = 'stageflow-progression-report-filter';
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
    // Local storage may be unavailable.
  }
}

function state() {
  return loadJson(APP_KEY, {});
}

function filterState() {
  return { school: 'All', programme: 'All', ...(loadJson(FILTER_KEY, {}) || {}) };
}

function saveFilter(next) {
  saveJson(FILTER_KEY, next);
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function csvValue(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
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

function stageOrder(stages = []) {
  return [...stages].sort((a, b) => {
    const na = stageNumber(a);
    const nb = stageNumber(b);
    if (na && nb) return na - nb;
    if (na) return -1;
    if (nb) return 1;
    if (String(a).toLowerCase().includes('self rescue')) return 1;
    if (String(b).toLowerCase().includes('self rescue')) return -1;
    return String(a).localeCompare(String(b));
  });
}

function stageCriteria(app, stage) {
  return app?.framework?.criteria?.[stage] || [];
}

function completedCount(learner, criteria) {
  return criteria.filter(item => learner?.res?.[item] === 'pass').length;
}

function stageComplete(app, learner, stage) {
  const criteria = stageCriteria(app, stage);
  return criteria.length > 0 && completedCount(learner, criteria) === criteria.length;
}

function highestEarnedStage(app, learner) {
  let highest = '';
  stageOrder(app?.framework?.stages || []).filter(stage => stageNumber(stage)).forEach(stage => {
    if (stageComplete(app, learner, stage)) highest = stage;
  });
  return highest || (stageNumber(learner?.stage) ? learner.stage : '');
}

function nextStage(app, stage) {
  const stages = stageOrder(app?.framework?.stages || []).filter(item => stageNumber(item));
  const index = stages.indexOf(stage);
  return index >= 0 ? (stages[index + 1] || '') : '';
}

function ncComplete(learner) {
  return NC_ITEMS.every(item => !!learner?.nc?.[item]);
}

function ncCount(learner) {
  return NC_ITEMS.filter(item => !!learner?.nc?.[item]).length;
}

function learnerProgress(app, learner, lesson) {
  const stage = learner.stage || app?.framework?.stages?.[0] || 'Stage 1';
  const criteria = stageCriteria(app, stage);
  const complete = completedCount(learner, criteria);
  const total = criteria.length;
  const remaining = Math.max(0, total - complete);
  let status = 'Working on stage';
  if (total && remaining === 0) status = nextStage(app, stage) ? 'Ready to move up' : 'Top stage complete';
  else if (total && remaining <= 2) status = 'Nearly ready';
  else if (total && complete === 0) status = 'Needs support';
  return {
    learner: learner.name || 'Unnamed learner',
    learnerId: learner.id,
    school: lesson?.school || 'School / Venue',
    programme: lessonProgramme(lesson),
    lesson: lesson?.name || 'Lesson',
    className: lesson?.className || '',
    year: lesson?.year || '',
    attendance: learner.att || 'Present',
    stage,
    highest: highestEarnedStage(app, learner),
    next: nextStage(app, stage),
    complete,
    total,
    remaining,
    status,
    front: learner?.dist?.front || '0m',
    back: learner?.dist?.back || '0m',
    nc: `${ncCount(learner)}/4`,
    ncComplete: ncComplete(learner)
  };
}

function allProgressRows(app = state()) {
  const lessons = Array.isArray(app.lessons) ? app.lessons : [];
  const learners = Array.isArray(app.learners) ? app.learners : [];
  return learners.map(learner => learnerProgress(app, learner, lessons.find(lesson => lesson.id === learner.lesson) || {}));
}

function filteredRows(app = state()) {
  const filters = filterState();
  return allProgressRows(app).filter(row => {
    const schoolOk = filters.school === 'All' || row.school === filters.school;
    const programmeOk = filters.programme === 'All' || row.programme === filters.programme;
    return schoolOk && programmeOk;
  });
}

function uniqueValues(rows, key) {
  return ['All', ...Array.from(new Set(rows.map(row => row[key]).filter(Boolean))).sort()];
}

function statusCounts(rows) {
  return rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
}

function options(values, selected) {
  return values.map(value => `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('');
}

function summaryHtml(rows) {
  const counts = statusCounts(rows);
  const ncDone = rows.filter(row => row.ncComplete).length;
  const totalRemaining = rows.reduce((sum, row) => sum + row.remaining, 0);
  return `
    <div class="progression-summary">
      <div class="progression-stat">${rows.length}<small>Filtered learners</small></div>
      <div class="progression-stat">${counts['Ready to move up'] || 0}<small>Ready to move up</small></div>
      <div class="progression-stat">${counts['Nearly ready'] || 0}<small>Nearly ready</small></div>
      <div class="progression-stat">${ncDone}<small>NC complete</small></div>
      <div class="progression-stat">${totalRemaining}<small>Total criteria left</small></div>
    </div>
  `;
}

function rowHtml(row) {
  const tone = row.status === 'Ready to move up' ? 'ready' : row.status === 'Nearly ready' ? 'nearly' : row.status === 'Needs support' ? 'support' : '';
  return `
    <div class="progression-row ${tone}">
      <div>
        <strong>${escapeHtml(row.learner)}</strong>
        <small>${escapeHtml(row.school)} · ${escapeHtml(row.programme)} · ${escapeHtml(row.year)}${row.className ? ' · ' + escapeHtml(row.className) : ''}</small>
      </div>
      <div>
        <span class="progression-badge">${escapeHtml(row.stage)}</span>
        <span class="progression-badge">${row.complete}/${row.total || 0} passed</span>
        <span class="progression-badge">${escapeHtml(row.status)}</span>
        <span class="progression-badge">NC ${escapeHtml(row.nc)}</span>
      </div>
      <small>Highest certificate: ${escapeHtml(row.highest || 'None yet')} · Front ${escapeHtml(row.front)} · Back ${escapeHtml(row.back)}${row.next ? ' · Next: ' + escapeHtml(row.next) : ''}</small>
    </div>
  `;
}

function csvRows(rows) {
  const headers = ['Learner','School/Venue','Programme','Lesson','Year/Class','Class/SEN','Attendance','Current Stage','Highest Earned Certificate','Next Stage','Passed Criteria','Total Criteria','Criteria Remaining','Progression Status','Front Distance','Back Distance','National Curriculum','NC Complete'];
  const body = rows.map(row => [row.learner,row.school,row.programme,row.lesson,row.year,row.className,row.attendance,row.stage,row.highest,row.next,row.complete,row.total,row.remaining,row.status,row.front,row.back,row.nc,row.ncComplete ? 'Yes' : 'No'].map(csvValue).join(','));
  return [headers.map(csvValue).join(','), ...body].join('\n');
}

function downloadCsv() {
  const rows = filteredRows();
  if (!rows.length) {
    alert('No learners match this report filter yet.');
    return;
  }
  const filters = filterState();
  const blob = new Blob([csvRows(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const school = String(filters.school || 'All').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'All';
  const programme = String(filters.programme || 'All').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'All';
  link.href = url;
  link.download = `StageFlow-progressions-${school}-${programme}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function markQueued() {
  const app = state();
  const filters = filterState();
  const audit = Array.isArray(app.audit) ? app.audit : [];
  app.audit = [`Progression report queued for ${filters.school} / ${filters.programme}`, ...audit];
  try { window.localStorage.setItem(APP_KEY, JSON.stringify(app)); } catch {}
  alert('Progression report queued in the demo audit log.');
}

function addStyles() {
  if (document.getElementById('stageflow-progression-reports-style')) return;
  const style = document.createElement('style');
  style.id = 'stageflow-progression-reports-style';
  style.textContent = `
    .progression-panel{border-top:5px solid #2563eb}
    .progression-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:10px 0}
    .progression-stat{border:1px solid #d9dee8;background:#f8fafc;border-radius:5px;padding:10px;font-weight:1000}
    .progression-stat small{display:block;color:#64748b;margin-top:3px}
    .progression-filter-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin:10px 0}
    .progression-row{border:1px solid #d9dee8;border-left:4px solid #2563eb;border-radius:5px;background:#fff;padding:10px;margin-top:8px}
    .progression-row.ready{border-left-color:#16a34a}
    .progression-row.nearly{border-left-color:#f97316}
    .progression-row.support{border-left-color:#dc2626}
    .progression-row strong{display:block}
    .progression-row small{display:block;color:#64748b;font-weight:800;margin-top:4px}
    .progression-badge{display:inline-flex;border:1px solid #d9dee8;background:#f8fafc;border-radius:999px;padding:4px 8px;margin:6px 4px 0 0;font-size:12px;font-weight:1000}
    .progression-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    .progression-actions button{border:1px solid #0f172a;background:#0f172a;color:#fff;border-radius:4px;padding:9px 12px;font-weight:1000}
    .progression-actions .orange{background:#f97316;border-color:#f97316}
  `;
  document.head.appendChild(style);
}

function buildPanel() {
  const app = state();
  const allRows = allProgressRows(app);
  const rows = filteredRows(app);
  const filters = filterState();
  const schools = uniqueValues(allRows, 'school');
  const programmes = uniqueValues(allRows, 'programme');
  return `
    <section class="card progression-panel" data-progression-reports>
      <h2>Progressions + filtered reports</h2>
      <p class="muted">Filter by school/venue and programme before exporting. This helps stop the wrong learner data being sent to the wrong customer.</p>
      <div class="progression-filter-grid">
        <div class="field"><label>School / Venue</label><select data-progression-filter="school">${options(schools, filters.school)}</select></div>
        <div class="field"><label>Programme</label><select data-progression-filter="programme">${options(programmes, filters.programme)}</select></div>
      </div>
      ${summaryHtml(rows)}
      <div class="progression-actions">
        <button class="orange" data-progression-action="download">Download filtered CSV</button>
        <button data-progression-action="queue">Queue report demo</button>
      </div>
      <section class="card"><h3>Progression list</h3>${rows.length ? rows.map(rowHtml).join('') : '<div class="progression-row"><strong>No learners match this filter</strong><small>Try switching school/venue or programme back to All.</small></div>'}</section>
    </section>
  `;
}

function mountProgressionReports() {
  addStyles();
  const reportsHero = Array.from(document.querySelectorAll('.hero h1')).find(h => h.textContent.trim() === 'End-of-Term Pack');
  const main = document.querySelector('main');
  if (!reportsHero || !main) return;
  const old = main.querySelector('[data-progression-reports]');
  if (old) old.remove();
  main.insertAdjacentHTML('beforeend', buildPanel());
  const panel = main.querySelector('[data-progression-reports]');
  panel?.addEventListener('change', event => {
    const input = event.target.closest('[data-progression-filter]');
    if (!input) return;
    const filters = filterState();
    filters[input.getAttribute('data-progression-filter')] = input.value;
    saveFilter(filters);
    mountProgressionReports();
  });
  panel?.addEventListener('click', event => {
    const button = event.target.closest('[data-progression-action]');
    if (!button) return;
    const action = button.getAttribute('data-progression-action');
    if (action === 'download') downloadCsv();
    if (action === 'queue') markQueued();
  });
}

let scheduled = false;
function scheduleMount() {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(() => {
    scheduled = false;
    mountProgressionReports();
  }, 100);
}

window.addEventListener('load', scheduleMount);
new MutationObserver(scheduleMount).observe(document.documentElement, { childList: true, subtree: true });
