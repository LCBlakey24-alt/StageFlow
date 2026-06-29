const REQUEST_KEY = 'stageflow-certificate-requests';
const APP_KEY = 'stageflow-state';
const DEFAULT_CHARGE = 3.5;
const BILLABLE_PROGRAMMES = ['Evening Swim Lessons', 'Private Lessons'];
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
    // Local storage may be unavailable on locked-down devices.
  }
}

function appState() {
  return loadJson(APP_KEY, {});
}

function requests() {
  const list = loadJson(REQUEST_KEY, []);
  return Array.isArray(list) ? list : [];
}

function saveRequests(list) {
  saveJson(REQUEST_KEY, list);
}

function money(value) {
  return `£${Number(value || 0).toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function stageNumber(stage) {
  const match = String(stage || '').match(/Stage\s*(\d+)/i);
  return match ? Number(match[1]) : 0;
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

function isBillableProgramme(programme) {
  return BILLABLE_PROGRAMMES.includes(programme);
}

function stageComplete(state, learner, stage) {
  const criteria = state?.framework?.criteria?.[stage] || [];
  if (!criteria.length) return false;
  return criteria.every(item => learner?.res?.[item] === 'pass');
}

function highestEarnedStage(state, learner) {
  const stages = (state?.framework?.stages || []).filter(stage => stageNumber(stage));
  let highest = '';
  stages.forEach(stage => {
    if (stageComplete(state, learner, stage)) highest = stage;
  });
  if (highest) return highest;
  return stageNumber(learner?.stage) ? learner.stage : '';
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
      billable: isBillableProgramme(programme)
    };
    const awards = [];
    if (stage) awards.push({ ...base, award: stage, kind: 'Highest stage' });
    if (nationalCurriculumEarned(learner)) awards.push({ ...base, award: 'National Curriculum', kind: 'Extra award' });
    return awards;
  });
}

function availableOffers() {
  const state = appState();
  const existing = requests();
  const seen = new Set(existing.filter(item => item.status !== 'Cancelled').map(item => awardKey(item.learnerId, item.award)));
  return earnedAwards(state).filter(item => item.billable && !seen.has(awardKey(item.learnerId, item.award)));
}

function includedSchoolAwards() {
  const state = appState();
  const existing = requests();
  const seen = new Set(existing.filter(item => item.status !== 'Cancelled').map(item => awardKey(item.learnerId, item.award)));
  return earnedAwards(state).filter(item => !item.billable && !seen.has(awardKey(item.learnerId, item.award)));
}

function addRequest(offer, accepted) {
  const list = requests();
  const charge = accepted ? DEFAULT_CHARGE : 0;
  list.unshift({
    id: `cr-${Date.now()}`,
    learnerId: offer.learnerId,
    learnerName: offer.learnerName,
    lessonId: offer.lessonId,
    lessonName: offer.lessonName,
    payer: offer.payer,
    programme: offer.programme,
    award: offer.award,
    kind: offer.kind,
    charge,
    status: accepted ? 'Charge added' : 'Declined by parent',
    requestedAt: new Date().toISOString(),
    printed: false,
    delivered: false
  });
  saveRequests(list);
}

function updateRequest(id, patch) {
  saveRequests(requests().map(item => item.id === id ? { ...item, ...patch } : item));
}

function deleteRequest(id) {
  saveRequests(requests().filter(item => item.id !== id));
}

function addStyles() {
  if (document.getElementById('stageflow-certificate-requests-style')) return;
  const style = document.createElement('style');
  style.id = 'stageflow-certificate-requests-style';
  style.textContent = `
    .cert-request-panel{border-top:5px solid #2563eb}
    .cert-request-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:8px;margin:10px 0}
    .cert-request-stat{background:#f8fafc;border:1px solid #d9dee8;border-radius:5px;padding:10px;font-weight:1000}
    .cert-request-stat small{display:block;color:#64748b;margin-top:3px}
    .cert-request-row{border:1px solid #d9dee8;border-left:4px solid #f97316;border-radius:5px;background:#fff;padding:10px;margin-top:8px}
    .cert-request-row strong{display:block}
    .cert-request-row small{display:block;color:#64748b;font-weight:800;margin-top:3px}
    .cert-request-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}
    .cert-request-actions button{border:1px solid #0f172a;background:#0f172a;color:#fff;border-radius:4px;padding:8px 10px;font-weight:1000}
    .cert-request-actions button.accept{background:#f97316;border-color:#f97316}
    .cert-request-actions button.light{background:#fff;color:#0f172a;border-color:#d9dee8}
    .cert-request-actions button.danger{background:#fff;color:#dc2626;border-color:#dc2626}
    .cert-request-badge{display:inline-flex;align-items:center;border-radius:999px;background:#0f172a;color:#fff;padding:4px 9px;margin:4px 4px 0 0;font-size:12px;font-weight:1000}
  `;
  document.head.appendChild(style);
}

function renderOfferRows(offers) {
  if (!offers.length) return '<div class="cert-request-row"><strong>No new billable certificate offers</strong><small>When an evening/private learner earns a certificate, it will appear here for parent acceptance.</small></div>';
  return offers.map((offer, index) => `
    <div class="cert-request-row">
      <strong>${escapeHtml(offer.learnerName)} — ${escapeHtml(offer.award)}</strong>
      <small>${escapeHtml(offer.programme)} · ${escapeHtml(offer.payer)} · ${escapeHtml(offer.kind)} · ${money(DEFAULT_CHARGE)} added to next monthly charge if accepted</small>
      <div class="cert-request-actions">
        <button class="accept" data-cert-request-action="accept" data-offer-index="${index}">Parent accepts certificate</button>
        <button class="light" data-cert-request-action="decline" data-offer-index="${index}">No certificate needed</button>
      </div>
    </div>
  `).join('');
}

function renderQueueRows(list) {
  const queue = list.filter(item => !item.delivered && item.status !== 'Cancelled' && item.status !== 'Declined by parent');
  if (!queue.length) return '<div class="cert-request-row"><strong>No certificates waiting to be made</strong><small>Accepted certificate requests will become coach/admin tasks here.</small></div>';
  return queue.map(item => `
    <div class="cert-request-row">
      <strong>${escapeHtml(item.learnerName)} — ${escapeHtml(item.award)}</strong>
      <small>${escapeHtml(item.status)} · ${escapeHtml(item.programme)} · ${money(item.charge)} · ${item.printed ? 'Printed/ready' : 'Needs making'}</small>
      <div class="cert-request-actions">
        <button data-cert-request-action="printed" data-id="${item.id}">Tick printed/ready</button>
        <button class="accept" data-cert-request-action="delivered" data-id="${item.id}">Tick delivered</button>
        <button class="danger" data-cert-request-action="cancel" data-id="${item.id}">Cancel request</button>
      </div>
    </div>
  `).join('');
}

function renderChargeRows(list) {
  const chargeable = list.filter(item => item.charge > 0 && item.status !== 'Cancelled' && item.status !== 'Declined by parent');
  if (!chargeable.length) return '<div class="cert-request-row"><strong>No monthly certificate charges yet</strong><small>Accepted billable certificate requests will be listed here.</small></div>';
  const total = chargeable.reduce((sum, item) => sum + Number(item.charge || 0), 0);
  return `<div class="cert-request-row"><strong>This month certificate extras: ${money(total)}</strong><small>${chargeable.length} accepted certificate charge(s).</small></div>` + chargeable.map(item => `
    <div class="cert-request-row">
      <strong>${escapeHtml(item.payer)} · ${escapeHtml(item.learnerName)}</strong>
      <small>${escapeHtml(item.award)} · ${money(item.charge)} · ${escapeHtml(item.status)}${item.delivered ? ' · Delivered' : ''}</small>
    </div>
  `).join('');
}

function renderIncludedRows(items) {
  if (!items.length) return '<div class="cert-request-row"><strong>No included school-pack certificates waiting</strong><small>School swimming certificates are treated as part of the school pack, not parent-billable.</small></div>';
  return items.slice(0, 8).map(item => `
    <div class="cert-request-row">
      <strong>${escapeHtml(item.learnerName)} — ${escapeHtml(item.award)}</strong>
      <small>${escapeHtml(item.programme)} · ${escapeHtml(item.payer)} · included in school/export pack</small>
    </div>
  `).join('');
}

function buildPanel() {
  const offers = availableOffers();
  const included = includedSchoolAwards();
  const list = requests();
  const queueCount = list.filter(item => !item.delivered && item.status !== 'Cancelled' && item.status !== 'Declined by parent').length;
  const deliveredCount = list.filter(item => item.delivered).length;
  const chargeTotal = list.filter(item => item.charge > 0 && item.status !== 'Cancelled' && item.status !== 'Declined by parent').reduce((sum, item) => sum + Number(item.charge || 0), 0);
  return `
    <section class="card cert-request-panel" data-cert-requests>
      <h2>Certificate requests + charges</h2>
      <p class="muted">For evening/private lessons: parent accepts the certificate, the charge is added to their next monthly payment, then the coach gets a make/deliver task.</p>
      <div class="cert-request-summary">
        <div class="cert-request-stat">${offers.length}<small>Parent offers waiting</small></div>
        <div class="cert-request-stat">${queueCount}<small>Coach tasks to make</small></div>
        <div class="cert-request-stat">${money(chargeTotal)}<small>Monthly extras</small></div>
        <div class="cert-request-stat">${deliveredCount}<small>Delivered</small></div>
      </div>
      <span class="cert-request-badge">Billable: evening + private lessons</span>
      <span class="cert-request-badge">School swimming: included in pack</span>
      <section class="card"><h3>Parent/customer certificate offers</h3>${renderOfferRows(offers)}</section>
      <section class="card"><h3>Coach notification queue</h3>${renderQueueRows(list)}</section>
      <section class="card"><h3>Monthly charge list</h3>${renderChargeRows(list)}</section>
      <section class="card"><h3>School-pack certificates</h3>${renderIncludedRows(included)}</section>
    </section>
  `;
}

function mountCertificateRequests() {
  addStyles();
  const certCard = Array.from(document.querySelectorAll('.card')).find(card => card.querySelector('h2')?.textContent?.trim() === 'Certificate templates');
  if (!certCard) return;
  const old = certCard.querySelector('[data-cert-requests]');
  if (old) old.remove();
  certCard.insertAdjacentHTML('beforeend', buildPanel());
  const panel = certCard.querySelector('[data-cert-requests]');
  if (!panel) return;
  panel.addEventListener('click', event => {
    const button = event.target.closest('[data-cert-request-action]');
    if (!button) return;
    const action = button.getAttribute('data-cert-request-action');
    const id = button.getAttribute('data-id');
    if (action === 'accept' || action === 'decline') {
      const offers = availableOffers();
      const offer = offers[Number(button.getAttribute('data-offer-index'))];
      if (!offer) return;
      if (action === 'accept' && !window.confirm(`${offer.learnerName} wants ${offer.award}. Add ${money(DEFAULT_CHARGE)} to the next monthly charge?`)) return;
      addRequest(offer, action === 'accept');
    }
    if (action === 'printed') updateRequest(id, { printed: true, status: 'Printed / ready' });
    if (action === 'delivered') updateRequest(id, { printed: true, delivered: true, status: 'Delivered', deliveredAt: new Date().toISOString() });
    if (action === 'cancel') {
      if (!window.confirm('Cancel this certificate request and remove it from the active charge/task queue?')) return;
      updateRequest(id, { status: 'Cancelled', charge: 0 });
    }
    if (action === 'delete') deleteRequest(id);
    mountCertificateRequests();
  });
}

let scheduled = false;
function scheduleMount() {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(() => {
    scheduled = false;
    mountCertificateRequests();
  }, 100);
}

window.addEventListener('load', scheduleMount);
new MutationObserver(scheduleMount).observe(document.documentElement, { childList: true, subtree: true });
