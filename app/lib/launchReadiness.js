import './progressionDashboard.js';

const CHECK_KEY = 'stageflow-launch-readiness';
const APP_KEY = 'stageflow-state';

const defaultChecks = [
  { id: 'privacy', label: 'Privacy policy written', detail: 'Needed before handling real learner, parent or school data.', required: true },
  { id: 'terms', label: 'Terms of service written', detail: 'Needed before taking paid customers or subscriptions.', required: true },
  { id: 'support', label: 'Support contact set', detail: 'Add a public support email for coaches, schools and parents.', required: true },
  { id: 'cloud', label: 'Cloud save and logins enabled', detail: 'Do not rely on local device storage for real public use.', required: true },
  { id: 'billing', label: 'Billing flow decided', detail: 'Stripe/GoCardless/invoice flow should be agreed before charging.', required: true },
  { id: 'school-export', label: 'School export filter tested', detail: 'Make sure reports can be separated by school/venue/programme.', required: true },
  { id: 'certificates', label: 'Certificate templates tested', detail: 'Upload templates, generate a batch, and test printing/saving PDF.', required: false },
  { id: 'mobile', label: 'Mobile/tablet route tested', detail: 'Create lesson, register, assess, save, export on a phone/tablet.', required: false },
  { id: 'beta-users', label: 'Beta testers chosen', detail: 'Use 2-3 trusted testers before selling publicly.', required: false }
];

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

function appState() {
  return loadJson(APP_KEY, {});
}

function checks() {
  const saved = loadJson(CHECK_KEY, {});
  return defaultChecks.map(item => ({ ...item, done: !!saved[item.id] }));
}

function setCheck(id, done) {
  const saved = loadJson(CHECK_KEY, {});
  saved[id] = done;
  saveJson(CHECK_KEY, saved);
}

function stateStats() {
  const state = appState();
  const lessons = Array.isArray(state.lessons) ? state.lessons : [];
  const learners = Array.isArray(state.learners) ? state.learners : [];
  const schools = [...new Set(lessons.map(lesson => lesson.school).filter(Boolean))];
  const programmes = [...new Set(lessons.map(lesson => lesson.programme).filter(Boolean))];
  return { lessons, learners, schools, programmes };
}

function readinessPercent(items) {
  if (!items.length) return 0;
  return Math.round((items.filter(item => item.done).length / items.length) * 100);
}

function betaWarningHtml(items) {
  const requiredMissing = items.filter(item => item.required && !item.done);
  if (!requiredMissing.length) {
    return '<div class="launch-ready-good"><strong>Public launch checklist is close.</strong><small>Run real-device testing and beta users before opening payments widely.</small></div>';
  }
  return '<div class="launch-ready-warning"><strong>Beta/testing mode only</strong><small>Do not use real child/customer data publicly until required launch checks are completed.</small></div>';
}

function buildLaunchPanel() {
  const items = checks();
  const stats = stateStats();
  const percent = readinessPercent(items);
  const requiredDone = items.filter(item => item.required && item.done).length;
  const requiredTotal = items.filter(item => item.required).length;
  return `
    <section class="card launch-ready-panel" data-launch-readiness>
      <h2>Public launch readiness</h2>
      <p class="muted">Use this as the final gate before putting StageFlow in front of paying customers or schools.</p>
      ${betaWarningHtml(items)}
      <div class="launch-ready-stats">
        <div class="launch-ready-stat">${percent}%<small>Checklist complete</small></div>
        <div class="launch-ready-stat">${requiredDone}/${requiredTotal}<small>Required checks</small></div>
        <div class="launch-ready-stat">${stats.lessons.length}<small>Lessons in app</small></div>
        <div class="launch-ready-stat">${stats.learners.length}<small>Learner records</small></div>
      </div>
      <div class="launch-ready-stats">
        <div class="launch-ready-stat">${stats.schools.length}<small>Schools/venues</small></div>
        <div class="launch-ready-stat">${stats.programmes.length}<small>Programmes</small></div>
      </div>
      <section class="card"><h3>Launch checklist</h3>${items.map(item => `
        <label class="launch-ready-row">
          <input type="checkbox" data-launch-check="${item.id}" ${item.done ? 'checked' : ''} />
          <span><strong>${escapeHtml(item.label)}${item.required ? ' *' : ''}</strong><small>${escapeHtml(item.detail)}</small></span>
        </label>
      `).join('')}</section>
      <section class="card"><h3>Recommended public launch order</h3>
        <div class="launch-ready-step"><strong>1. Private beta</strong><small>Use fake/demo data and 2-3 trusted testers.</small></div>
        <div class="launch-ready-step"><strong>2. Secure beta</strong><small>Add cloud save, staff logins, privacy docs and support email.</small></div>
        <div class="launch-ready-step"><strong>3. Paid web launch</strong><small>Start charging through invoices/subscriptions before app-store release.</small></div>
        <div class="launch-ready-step"><strong>4. App store release</strong><small>Wrap the stable web app into iOS/Android once the workflow is proven.</small></div>
      </section>
    </section>
  `;
}

function addStyles() {
  if (document.getElementById('stageflow-launch-readiness-style')) return;
  const style = document.createElement('style');
  style.id = 'stageflow-launch-readiness-style';
  style.textContent = `
    .launch-ready-panel{border-top:5px solid #dc2626}
    .launch-ready-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:10px 0}
    .launch-ready-stat{border:1px solid #d9dee8;background:#f8fafc;border-radius:5px;padding:10px;font-weight:1000}
    .launch-ready-stat small{display:block;color:#64748b;margin-top:3px}
    .launch-ready-warning,.launch-ready-good{border-radius:5px;padding:11px;margin:10px 0;font-weight:1000}
    .launch-ready-warning{border:1px solid #dc2626;background:#fef2f2;color:#7f1d1d}
    .launch-ready-good{border:1px solid #16a34a;background:#f0fdf4;color:#14532d}
    .launch-ready-warning small,.launch-ready-good small{display:block;margin-top:4px;font-weight:800}
    .launch-ready-row{display:flex;gap:10px;align-items:flex-start;border:1px solid #d9dee8;border-left:4px solid #f97316;border-radius:5px;background:#fff;padding:10px;margin-top:8px;text-transform:none;letter-spacing:0;color:#0f172a;font-size:14px}
    .launch-ready-row input{width:auto;margin-top:3px}
    .launch-ready-row small{display:block;color:#64748b;margin-top:3px;font-weight:800}
    .launch-ready-step{border:1px solid #d9dee8;border-left:4px solid #2563eb;border-radius:5px;background:#fff;padding:10px;margin-top:8px;font-weight:1000}
    .launch-ready-step small{display:block;color:#64748b;margin-top:3px;font-weight:800}
  `;
  document.head.appendChild(style);
}

function mountLaunchReadiness() {
  addStyles();
  const healthHero = Array.from(document.querySelectorAll('.hero h1')).find(h => h.textContent.trim() === 'Stability health check');
  const main = document.querySelector('main');
  if (!healthHero || !main) return;
  const old = main.querySelector('[data-launch-readiness]');
  if (old) old.remove();
  main.insertAdjacentHTML('beforeend', buildLaunchPanel());
  const panel = main.querySelector('[data-launch-readiness]');
  panel?.addEventListener('change', event => {
    const input = event.target.closest('[data-launch-check]');
    if (!input) return;
    setCheck(input.getAttribute('data-launch-check'), input.checked);
    mountLaunchReadiness();
  });
}

let scheduled = false;
function scheduleMount() {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(() => {
    scheduled = false;
    mountLaunchReadiness();
  }, 100);
}

window.addEventListener('load', scheduleMount);
new MutationObserver(scheduleMount).observe(document.documentElement, { childList: true, subtree: true });
