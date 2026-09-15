const APP_KEY = 'stageflow-state';
const REQUEST_KEY = 'stageflow-certificate-requests';
const FILTER_KEY = 'stageflow-report-filters';
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

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function safeFileName(value) {
  return String(value || 'stageflow').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'stageflow';
}

function csvCell(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadCsv(filename, rows) {
  const csv = rows.map(row => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function appState() {
  return loadJson(APP_KEY, {});
}

function certificateRequests() {
  const list = loadJson(REQUEST_KEY, []);
  return Array.isArray(list) ? list : [];
}

function reportFilters() {
  return { school: 'All', programme: 'All', ...(loadJson(FILTER_KEY, {}) || {}) };
}

function setReportFilters(next) {
  saveJson(FILTER_KEY, { ...reportFilters(), ...next });
}

function normaliseProgramme(programme) {
  const text = String(programme || '').trim();
  if (text === 'Evening Swim Lessons') return 'Evening Swim Group';
  if (['Evening 1:1', 'Evening Swim 121', 'Evening Swim One-to-one'].includes(text)) return 'Evening Swim 1:1';
  return text || 'School Swimming';
}

function lessonProgramme(lesson = {}) {
  if (lesson.programme) return normaliseProgramme(lesson.programme);
  const text = `${lesson.school || ''} ${lesson.name || ''} ${lesson.year || ''} ${lesson.className || ''}`.toLowerCase();
  if (text.includes('1:1') || text.includes('121') || text.includes('one to one') || text.includes('one-to-one')) return 'Evening Swim 1:1';
  if (text.includes('evening')) return 'Evening Swim Group';
  if (text.includes('private')) return 'Private Lessons';
  if (text.includes('gym')) return 'Gymnastics';
  if (text.includes('pe')) return 'School PE';
  return 'School Swimming';
}

function groupTemplate(state, lesson = {}) {
  return (state?.framework?.groupTemplates || []).find(group => group.id === lesson.groupTemplateId) || null;
}

function groupLabel(state, lesson = {}) {
  const group = groupTemplate(state, lesson);
  if (!group) return 'No criteria group';
  return `${group.name}${group.detail ? ' · ' + group.detail : ''}`;
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

function lessonCriteria(state, lesson = {}) {
  if (!lesson || lesson.mode === 'National Curriculum only') return [];
  const group = groupTemplate(state, lesson);
  const stages = group?.stages?.length ? group.stages : state?.framework?.stages || [];
  return [...new Set(stageOrder(stages).flatMap(stage => state?.framework?.criteria?.[stage] || []))];
}

function buildFilteredData() {
  const state = appState();
  const filters = reportFilters();
  const lessons = Array.isArray(state.lessons) ? state.lessons : [];
  const learners = Array.isArray(state.learners) ? state.learners : [];
  const filteredLessons = lessons.filter(lesson => {
    const schoolOk = filters.school === 'All' || lesson.school === filters.school;
    const programmeOk = filters.programme === 'All' || lessonProgramme(lesson) === filters.programme;
    return schoolOk && programmeOk;
  });
  const lessonIds = new Set(filteredLessons.map(lesson => lesson.id));
  const filteredLearners = learners.filter(learner => lessonIds.has(learner.lesson));
  const lessonsById = new Map(lessons.map(lesson => [lesson.id, lesson]));
  const schools = [...new Set(lessons.map(lesson => lesson.school || 'School / Venue'))].sort();
  const programmes = [...new Set(lessons.map(lessonProgramme))].sort();
  return { state, filters, lessons, learners, filteredLessons, filteredLearners, lessonsById, schools, programmes };
}

function ncCount(learner) {
  return NC_ITEMS.filter(item => !!learner?.nc?.[item]).length;
}

function ncAchieved(learner) {
  return ncCount(learner) === NC_ITEMS.length;
}

function passedCriteriaCount(learner, criteria) {
  return criteria.filter(item => learner?.res?.[item] === 'pass').length;
}

function learnerProgressRows(data) {
  return [
    ['Learner', 'School/Venue', 'Programme', 'Lesson', 'Day', 'Time', 'Year/Class', 'Class/SEN', 'Attendance', 'Criteria Group', 'Front Distance', 'Back Distance', 'NC Items Complete', 'NC Achieved', 'Group Criteria Passed', 'Group Criteria Total'],
    ...data.filteredLearners.map(learner => {
      const lesson = data.lessonsById.get(learner.lesson) || {};
      const criteria = lessonCriteria(data.state, lesson);
      return [
        learner.name,
        lesson.school || '',
        lessonProgramme(lesson),
        lesson.name || '',
        lesson.day || '',
        lesson.time || '',
        lesson.year || '',
        lesson.className || '',
        learner.att || '',
        groupLabel(data.state, lesson),
        learner.dist?.front || '0m',
        learner.dist?.back || '0m',
        `${ncCount(learner)}/${NC_ITEMS.length}`,
        ncAchieved(learner) ? 'Yes' : 'No',
        passedCriteriaCount(learner, criteria),
        criteria.length
      ];
    })
  ];
}

function registerRows(data) {
  return [
    ['School/Venue', 'Programme', 'Lesson', 'Day', 'Time', 'Criteria Group', 'Learner', 'Attendance', 'Coach'],
    ...data.filteredLearners.map(learner => {
      const lesson = data.lessonsById.get(learner.lesson) || {};
      return [lesson.school || '', lessonProgramme(lesson), lesson.name || '', lesson.day || '', lesson.time || '', groupLabel(data.state, lesson), learner.name || '', learner.att || '', lesson.coach || ''];
    })
  ];
}

function chargeRows(data) {
  const lessonIds = new Set(data.filteredLessons.map(lesson => lesson.id));
  const rows = certificateRequests().filter(item => lessonIds.has(item.lessonId) && item.charge > 0 && item.status !== 'Cancelled' && item.status !== 'Declined by parent');
  return [
    ['Payer', 'Programme', 'Learner', 'Award', 'Status', 'Charge', 'Delivered'],
    ...rows.map(item => [item.payer || '', normaliseProgramme(item.programme), item.learnerName || '', item.award || '', item.status || '', Number(item.charge || 0).toFixed(2), item.delivered ? 'Yes' : 'No'])
  ];
}

function isBillableProgramme(programme) {
  return ['Evening Swim Group', 'Evening Swim 1:1', 'Private Lessons'].includes(normaliseProgramme(programme));
}

function schoolPackWarning(data) {
  const hasBillable = data.filteredLessons.some(lesson => isBillableProgramme(lessonProgramme(lesson)));
  const hasSchool = data.filteredLessons.some(lesson => lessonProgramme(lesson) === 'School Swimming');
  if (hasBillable && hasSchool) return '<div class="school-report-warning"><strong>Mixed report warning</strong><small>This export includes school swimming plus evening/private work. Use the programme filter before sending to a school.</small></div>';
  if (!data.filteredLessons.length) return '<div class="school-report-warning"><strong>No matching lessons</strong><small>Change the school/venue or programme filter.</small></div>';
  return '<div class="school-report-good"><strong>Filtered export ready</strong><small>Only the selected school/venue/programme will be included in the CSV downloads.</small></div>';
}

function optionHtml(values, selected) {
  return ['All', ...values].map(value => `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('');
}

function buildPanel() {
  const data = buildFilteredData();
  const lessonIds = new Set(data.filteredLessons.map(lesson => lesson.id));
  const chargeCount = certificateRequests().filter(item => lessonIds.has(item.lessonId) && item.charge > 0 && item.status !== 'Cancelled' && item.status !== 'Declined by parent').length;
  const ncDone = data.filteredLearners.filter(ncAchieved).length;
  const filenameBase = safeFileName(`${data.filters.school}-${data.filters.programme}`);
  return `
    <section class="card school-report-panel" data-school-reports>
      <h2>School / venue export filter</h2>
      <p class="muted">Choose exactly who this report is for before downloading. The CSVs now include the selected criteria group so schools and venues can see what was assessed.</p>
      ${schoolPackWarning(data)}
      <div class="grid2">
        <div class="field"><label>School / Venue</label><select data-school-report-filter="school">${optionHtml(data.schools, data.filters.school)}</select></div>
        <div class="field"><label>Programme</label><select data-school-report-filter="programme">${optionHtml(data.programmes, data.filters.programme)}</select></div>
      </div>
      <div class="school-report-stats">
        <div class="school-report-stat">${data.filteredLessons.length}<small>Sessions included</small></div>
        <div class="school-report-stat">${data.filteredLearners.length}<small>Learner records</small></div>
        <div class="school-report-stat">${ncDone}<small>NC achieved</small></div>
        <div class="school-report-stat">${chargeCount}<small>Certificate charges</small></div>
      </div>
      <div class="school-report-actions">
        <button data-school-report-download="progress" data-file-base="${filenameBase}">Download learner progress CSV</button>
        <button data-school-report-download="register" data-file-base="${filenameBase}">Download register CSV</button>
        <button data-school-report-download="charges" data-file-base="${filenameBase}">Download certificate charges CSV</button>
      </div>
      <section class="card"><h3>Preview</h3>${data.filteredLessons.slice(0, 6).map(lesson => `
        <div class="school-report-row"><strong>${escapeHtml(lesson.school)} · ${escapeHtml(lesson.name)}</strong><small>${escapeHtml(lessonProgramme(lesson))} · ${escapeHtml(groupLabel(data.state, lesson))} · ${escapeHtml(lesson.day)} · ${escapeHtml(lesson.time)} · ${escapeHtml(lesson.year || '')}${lesson.className ? ' · ' + escapeHtml(lesson.className) : ''}</small></div>
      `).join('') || '<div class="school-report-row"><strong>No sessions match this filter</strong><small>Pick a different school/venue or programme.</small></div>'}</section>
    </section>
  `;
}

function addStyles() {
  if (document.getElementById('stageflow-school-report-style')) return;
  const style = document.createElement('style');
  style.id = 'stageflow-school-report-style';
  style.textContent = `
    .school-report-panel{border-top:5px solid #2563eb}
    .school-report-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:10px 0}
    .school-report-stat{border:1px solid #d9dee8;background:#f8fafc;border-radius:5px;padding:10px;font-weight:1000}
    .school-report-stat small{display:block;color:#64748b;margin-top:3px}
    .school-report-warning,.school-report-good{border-radius:5px;padding:11px;margin:10px 0;font-weight:1000}
    .school-report-warning{border:1px solid #dc2626;background:#fef2f2;color:#7f1d1d}
    .school-report-good{border:1px solid #16a34a;background:#f0fdf4;color:#14532d}
    .school-report-warning small,.school-report-good small{display:block;margin-top:4px;font-weight:800}
    .school-report-actions{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
    .school-report-actions button{border:1px solid #0f172a;background:#0f172a;color:#fff;border-radius:4px;padding:9px 11px;font-weight:1000}
    .school-report-row{border:1px solid #d9dee8;border-left:4px solid #f97316;border-radius:5px;background:#fff;padding:10px;margin-top:8px;font-weight:1000}
    .school-report-row small{display:block;color:#64748b;margin-top:3px;font-weight:800}
  `;
  document.head.appendChild(style);
}

function reportsMain() {
  const hero = Array.from(document.querySelectorAll('.hero h1')).find(h => {
    const text = h.textContent.trim();
    return text === 'Progress Overview' || text === 'End-of-Term Pack' || text === 'Reports';
  });
  if (!hero) return null;
  return document.querySelector('main');
}

function mountSchoolReports() {
  addStyles();
  const main = reportsMain();
  if (!main) return;
  const old = main.querySelector('[data-school-reports]');
  if (old) old.remove();
  main.insertAdjacentHTML('beforeend', buildPanel());
  const panel = main.querySelector('[data-school-reports]');
  panel?.addEventListener('change', event => {
    const input = event.target.closest('[data-school-report-filter]');
    if (!input) return;
    setReportFilters({ [input.getAttribute('data-school-report-filter')]: input.value });
    mountSchoolReports();
  });
  panel?.addEventListener('click', event => {
    const button = event.target.closest('[data-school-report-download]');
    if (!button) return;
    const type = button.getAttribute('data-school-report-download');
    const base = button.getAttribute('data-file-base') || 'stageflow-export';
    const data = buildFilteredData();
    if (type === 'progress') downloadCsv(`${base}-learner-progress.csv`, learnerProgressRows(data));
    if (type === 'register') downloadCsv(`${base}-register.csv`, registerRows(data));
    if (type === 'charges') downloadCsv(`${base}-certificate-charges.csv`, chargeRows(data));
  });
}

let scheduled = false;
function scheduleMount() {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(() => {
    scheduled = false;
    mountSchoolReports();
  }, 100);
}

window.addEventListener('load', scheduleMount);
new MutationObserver(scheduleMount).observe(document.documentElement, { childList: true, subtree: true });