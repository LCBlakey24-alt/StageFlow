const APP_KEY = 'stageflow-state';
const REQUEST_KEY = 'stageflow-certificate-requests';
const DEFAULT_CHARGE = 3.5;
const BILLABLE_PROGRAMMES = ['Evening Swim Group', 'Evening Swim 1:1', 'Private Lessons'];
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
    // Ignore local-storage issues on locked-down devices.
  }
}

function html(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function money(value) {
  return `£${Number(value || 0).toFixed(2)}`;
}

function normaliseProgramme(programme) {
  const value = String(programme || '').trim();
  if (!value) return 'School Swimming';
  if (value === 'Evening Swim Lessons') return 'Evening Swim Group';
  if (['Evening Swim 121', 'Evening 1:1', 'Evening Swim One-to-one'].includes(value)) return 'Evening Swim 1:1';
  return value;
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

function stageNumber(stage) {
  const match = String(stage || '').match(/Stage\s*(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function stageComplete(state, learner, stage) {
  const criteria = state?.framework?.criteria?.[stage] || [];
  return criteria.length > 0 && criteria.every(item => learner?.res?.[item] === 'pass');
}

function highestEarnedStage(state, learner) {
  const stages = (state?.framework?.stages || []).filter(stage => stageNumber(stage));
  let highest = '';
  stages.forEach(stage => {
    if (stageComplete(state, learner, stage)) highest = stage;
  });
  return highest || (stageNumber(learner?.stage) ? learner.stage : '');
}

function nationalCurriculumEarned(learner) {
  const nc = learner?.nc || {};
  return NC_ITEMS.every(item => !!nc[item]);
}

function awardKey(learnerId, award) {
  return `${learnerId}::${award}`;
}

function earnedAwards(state) {
  const lessons = Array.isArray(state.lessons) ? state.lessons : [];
  const learners = Array.isArray(state.learners) ? state.learners : [];
  return learners.flatMap(learner => {
    const lesson = lessons.find(item => item.id === learner.lesson) || {};
    const programme = lessonProgramme(lesson);
    const stage = highestEarnedStage(state, learner);
    const base = {
      learnerId: learner.id,
      learnerName: learner.name || 'Unnamed learner',
      lessonId: learner.lesson,
      lessonName: lesson.name || 'Lesson',
      payer: lesson.school || lesson.name || 'Account',
      programme,
      billable: BILLABLE_PROGRAMMES.includes(normaliseProgramme(programme))
    };
    const awards = [];
    if (stage) awards.push({ ...base, award: stage, kind: 'Highest stage' });
    if (nationalCurriculumEarned(learner)) awards.push({ ...base, award: 'National Curriculum', kind: 'Extra award' });
    return awards;
  });
}

function certificateData() {
  const state = loadJson(APP_KEY, {});
  const requests = loadJson(REQUEST_KEY, []);
  const requestList = Array.isArray(requests) ? requests : [];
  const activeRequests = requestList.filter(item => item.status !== 'Cancelled');
  const seen = new Set(activeRequests.map(item => awardKey(item.learnerId, item.award)));
  const earned = earnedAwards(state);
  const billableOffers = earned.filter(item => item.billable && !seen.has(awardKey(item.learnerId, item.award)));
  const includedOffers = earned.filter(item => !item.billable && !seen.has(awardKey(item.learnerId, item.award)));
  const accepted = requestList.filter(item => item.charge > 0 && item.status !== 'Cancelled' && item.status !== 'Declined by parent');
  const coachQueue = requestList.filter(item => !item.delivered && item.status !== 'Cancelled' && item.status !== 'Declined by parent');
  const delivered = requestList.filter(item => item.delivered);
  const totalCharges = accepted.reduce((sum, item) => sum + Number(item.charge || 0), 0);
  return { state, requestList, billableOffers, includedOffers, accepted, coachQueue, delivered, totalCharges };
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCertificateCsv() {
  const { requestList } = certificateData();
  const rows = [
    ['Payer', 'Programme', 'Learner', 'Lesson', 'Award', 'Kind', 'Status', 'Charge', 'Printed', 'Delivered', 'Requested At'],
    ...requestList.map(item => [
      item.payer || '',
      normaliseProgramme(item.programme),
      item.learnerName || '',
      item.lessonName || '',
      item.award || '',
      item.kind || '',
      item.status || '',
      Number(item.charge || 0).toFixed(2),
      item.printed ? 'Yes' : 'No',
      item.delivered ? 'Yes' : 'No',
      item.requestedAt || ''
    ])
  ];
  const csv = rows.map(row => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'StageFlow-certificate-requests.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function openCertificateSettings() {
  const state = loadJson(APP_KEY, {});
  saveJson(APP_KEY, { ...state, screen: 'settings', tab: 'certificates', step: 'list' });
  window.location.reload();
}

function addStyles() {
  if (document.getElementById('stageflow-certificate-report-summary-style')) return;
  const style = document.createElement('style');
  style.id = 'stageflow-certificate-report-summary-style';
  style.textContent = `
    .certificate-report-summary{border-top:5px solid #f97316;background:linear-gradient(180deg,#fff8f1,#fff)!important}
    .certificate-report-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:8px;margin:10px 0}
    .certificate-report-stat{border:1px solid #f6d5b9;background:#fff;border-radius:5px;padding:10px;font-weight:1000}
    .certificate-report-stat small{display:block;color:#64748b;margin-top:3px;font-weight:850}
    .certificate-report-actions{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
    .certificate-report-actions button{border:1px solid #0f172a;background:#0f172a;color:#fff;border-radius:4px;padding:9px 11px;font-weight:1000}
    .certificate-report-actions .orange{background:#f97316;border-color:#f97316}
    .certificate-report-row{border:1px solid #d9dee8;border-left:4px solid #2563eb;border-radius:5px;background:#fff;padding:10px;margin-top:8px;font-weight:1000}
    .certificate-report-row.ready{border-left-color:#16a34a}
    .certificate-report-row.waiting{border-left-color:#f97316}
    .certificate-report-row small{display:block;color:#64748b;margin-top:3px;font-weight:800}
    .certificate-report-warning{border:1px solid #f97316;background:#fff7ed;color:#9a3412;border-radius:5px;padding:10px;margin:10px 0;font-weight:1000}
    .certificate-report-warning small{display:block;margin-top:3px;font-weight:850}
  `;
  document.head.appendChild(style);
}

function previewRows(items, emptyText) {
  if (!items.length) return `<div class="certificate-report-row"><strong>${html(emptyText)}</strong><small>Nothing waiting in this section right now.</small></div>`;
  return items.slice(0, 5).map(item => `
    <div class="certificate-report-row ${item.delivered ? 'ready' : 'waiting'}">
      <strong>${html(item.learnerName)} — ${html(item.award)}</strong>
      <small>${html(normaliseProgramme(item.programme))} · ${html(item.payer || item.lessonName)} · ${item.charge > 0 ? money(item.charge) : 'Included'} · ${html(item.status || item.kind || 'Waiting')}</small>
    </div>
  `).join('');
}

function buildPanel() {
  const data = certificateData();
  return `
    <section class="card certificate-report-summary" data-certificate-report-summary>
      <h2>Certificate money + make list</h2>
      <p class="muted">A reports-screen snapshot of parent offers, accepted certificate charges, and coach make/deliver tasks.</p>
      ${data.billableOffers.length ? `<div class="certificate-report-warning"><strong>${data.billableOffers.length} certificate offer${data.billableOffers.length === 1 ? '' : 's'} waiting</strong><small>Open certificate settings to accept/decline parent requests.</small></div>` : ''}
      <div class="certificate-report-grid">
        <div class="certificate-report-stat">${data.billableOffers.length}<small>Parent offers</small></div>
        <div class="certificate-report-stat">${data.coachQueue.length}<small>Make/deliver tasks</small></div>
        <div class="certificate-report-stat">${money(data.totalCharges)}<small>Accepted extras</small></div>
        <div class="certificate-report-stat">${data.includedOffers.length}<small>Included school awards</small></div>
        <div class="certificate-report-stat">${data.delivered.length}<small>Delivered</small></div>
      </div>
      <div class="certificate-report-actions">
        <button class="orange" data-certificate-report-action="open-settings">Open certificate settings</button>
        <button data-certificate-report-action="download-csv">Download certificate CSV</button>
      </div>
      <section class="card"><h3>Coach tasks</h3>${previewRows(data.coachQueue, 'No certificates waiting to be made')}</section>
      <section class="card"><h3>Accepted charges</h3>${previewRows(data.accepted, 'No accepted certificate charges yet')}</section>
    </section>
  `;
}

function reportsMain() {
  return Array.from(document.querySelectorAll('.hero h1')).find(heading => {
    const text = heading.textContent.trim();
    return text === 'Progress Overview' || text === 'Reports' || text === 'End-of-Term Pack';
  }) ? document.querySelector('main') : null;
}

function mountSummary() {
  addStyles();
  const main = reportsMain();
  if (!main) return;
  const old = main.querySelector('[data-certificate-report-summary]');
  if (old) old.remove();
  main.insertAdjacentHTML('beforeend', buildPanel());
  const panel = main.querySelector('[data-certificate-report-summary]');
  if (!panel) return;
  panel.addEventListener('click', event => {
    const button = event.target.closest('[data-certificate-report-action]');
    if (!button) return;
    const action = button.getAttribute('data-certificate-report-action');
    if (action === 'open-settings') openCertificateSettings();
    if (action === 'download-csv') downloadCertificateCsv();
  });
}

let scheduled = false;
function scheduleMount() {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(() => {
    scheduled = false;
    mountSummary();
  }, 100);
}

window.addEventListener('load', scheduleMount);
new MutationObserver(scheduleMount).observe(document.documentElement, { childList: true, subtree: true });