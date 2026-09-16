const STATE_KEY = 'stageflow-state';
const CERTIFICATE_KEY = 'stageflow-certificate-requests';
const PROGRESSION_FILTER_KEY = 'stageflow-progression-report-filter';
const REPORT_FILTER_KEY = 'stageflow-report-filters';
const LAUNCH_KEY = 'stageflow-launch-readiness';
const POOLSIDE_FILTER_KEY = 'stageflow-poolside-filter';
const BACKUP_VERSION = 1;

const backupKeys = [
  STATE_KEY,
  CERTIFICATE_KEY,
  PROGRESSION_FILTER_KEY,
  REPORT_FILTER_KEY,
  LAUNCH_KEY,
  POOLSIDE_FILTER_KEY
];

function readJson(key, fallback = null) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    if (value === undefined || value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can fail in private browsing or locked-down webviews.
  }
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function safeDateStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function appState() {
  return readJson(STATE_KEY, {});
}

function createBackup() {
  const state = appState();
  const saved = {};
  backupKeys.forEach(key => {
    saved[key] = readJson(key, null);
  });
  return {
    app: 'Stage Flow',
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    summary: {
      lessons: Array.isArray(state.lessons) ? state.lessons.length : 0,
      learners: Array.isArray(state.learners) ? state.learners.length : 0,
      criteriaGroups: Array.isArray(state.framework?.groupTemplates) ? state.framework.groupTemplates.length : 0,
      certificateRequests: Array.isArray(saved[CERTIFICATE_KEY]) ? saved[CERTIFICATE_KEY].length : 0
    },
    localStorage: saved
  };
}

function backupText() {
  return JSON.stringify(createBackup(), null, 2);
}

function downloadBackup() {
  const backup = createBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `StageFlow-backup-${safeDateStamp()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

async function copyBackup() {
  const text = backupText();
  try {
    await navigator.clipboard.writeText(text);
    alert('Stage Flow backup copied to clipboard.');
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
      alert('Stage Flow backup copied to clipboard.');
    } catch {
      alert('Could not copy automatically. Use Download backup instead.');
    }
    area.remove();
  }
}

function normaliseImportedBackup(raw) {
  const parsed = JSON.parse(raw);
  if (parsed?.app === 'Stage Flow' && parsed?.localStorage && typeof parsed.localStorage === 'object') {
    return parsed.localStorage;
  }
  if (parsed?.lessons || parsed?.learners || parsed?.framework) {
    return { [STATE_KEY]: parsed };
  }
  throw new Error('Not a recognised Stage Flow backup file.');
}

function restoreBackupFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = normaliseImportedBackup(String(reader.result || ''));
      const lessons = Array.isArray(data[STATE_KEY]?.lessons) ? data[STATE_KEY].lessons.length : 0;
      const learners = Array.isArray(data[STATE_KEY]?.learners) ? data[STATE_KEY].learners.length : 0;
      const ok = window.confirm(`Restore this Stage Flow backup?\n\nLessons: ${lessons}\nLearners: ${learners}\n\nThis will replace the demo data currently saved on this device.`);
      if (!ok) return;
      backupKeys.forEach(key => writeJson(key, data[key] ?? null));
      alert('Backup restored. Stage Flow will reload now.');
      window.location.reload();
    } catch (error) {
      alert(error?.message || 'Could not restore this backup file.');
    }
  };
  reader.onerror = () => alert('Could not read this backup file.');
  reader.readAsText(file);
}

function addStyles() {
  if (document.getElementById('stageflow-local-backup-style')) return;
  const style = document.createElement('style');
  style.id = 'stageflow-local-backup-style';
  style.textContent = `
    .local-backup-panel{border-top:5px solid #f97316;background:linear-gradient(180deg,#fff8f1,#fff)!important}
    .local-backup-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:10px 0}
    .local-backup-stat{border:1px solid #f6d5b9;background:#fff;border-radius:14px;padding:10px;font-weight:1000}
    .local-backup-stat small{display:block;color:#60738a;margin-top:3px;font-weight:850}
    .local-backup-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    .local-backup-actions button,.local-backup-actions label{border:1px solid #0f172a;background:#0f172a;color:#fff;border-radius:999px;padding:9px 12px;font-weight:1000;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
    .local-backup-actions .orange{background:#f97316;border-color:#f97316}
    .local-backup-actions .light{background:#fff;color:#0f172a;border-color:#d9dee8}
    .local-backup-note{border-left-color:#2563eb!important;background:#f8fbff!important}
  `;
  document.head.appendChild(style);
}

function buildPanel() {
  const backup = createBackup();
  return `
    <section class="card local-backup-panel" data-local-backup-tools>
      <h2>Backup this device</h2>
      <p class="muted">Stage Flow is still using local demo storage, so save a backup before resetting, testing, or making bigger changes.</p>
      <div class="local-backup-grid">
        <div class="local-backup-stat">${backup.summary.lessons}<small>Sessions saved</small></div>
        <div class="local-backup-stat">${backup.summary.learners}<small>Learners saved</small></div>
        <div class="local-backup-stat">${backup.summary.criteriaGroups}<small>Criteria groups</small></div>
        <div class="local-backup-stat">${backup.summary.certificateRequests}<small>Certificate requests</small></div>
      </div>
      <div class="folder local-backup-note"><strong>Use this before Reset.</strong><p class="muted">Download gives you a JSON file. Restore lets you put the saved data back onto this phone or another device.</p></div>
      <div class="local-backup-actions">
        <button class="orange" data-local-backup-action="download">Download backup</button>
        <button data-local-backup-action="copy">Copy backup</button>
        <label class="light">Restore backup<input type="file" accept="application/json,.json" data-local-backup-import hidden /></label>
      </div>
      <p class="muted">Last checked: ${escapeHtml(new Date().toLocaleString())}</p>
    </section>
  `;
}

function settingsMain() {
  const heading = Array.from(document.querySelectorAll('.hero h1')).find(item => item.textContent.trim() === 'Settings');
  return heading ? document.querySelector('main') : null;
}

function mountPanel() {
  addStyles();
  const main = settingsMain();
  if (!main) return;
  const old = main.querySelector('[data-local-backup-tools]');
  if (old) old.remove();
  const hero = main.querySelector('.hero');
  if (hero) hero.insertAdjacentHTML('afterend', buildPanel());
  else main.insertAdjacentHTML('afterbegin', buildPanel());
  const panel = main.querySelector('[data-local-backup-tools]');
  panel?.addEventListener('click', event => {
    const button = event.target.closest('[data-local-backup-action]');
    if (!button) return;
    const action = button.getAttribute('data-local-backup-action');
    if (action === 'download') downloadBackup();
    if (action === 'copy') copyBackup();
  });
  panel?.addEventListener('change', event => {
    const input = event.target.closest('[data-local-backup-import]');
    if (!input) return;
    restoreBackupFile(input.files?.[0]);
    input.value = '';
  });
}

let scheduled = false;
function scheduleMount() {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(() => {
    scheduled = false;
    mountPanel();
  }, 100);
}

window.addEventListener('load', scheduleMount);
new MutationObserver(scheduleMount).observe(document.documentElement, { childList: true, subtree: true });
