const STATE_KEY = 'stageflow-state';
const RELOAD_KEY = 'stageflow-gymnastics-criteria-reloaded-v1';
const PROGRAMME = 'Gymnastics';

const GYM_STAGES = [
  'Gymnastics Beginner',
  'Gymnastics Improver',
  'Gymnastics Advanced'
];

const GYM_CRITERIA = {
  'Gymnastics Beginner': [
    'Shows safe listening and space awareness',
    'Joins in with warm-up and basic stretches',
    'Travels using animal walks with control',
    'Performs star, tuck, straight and pike shapes',
    'Balances on one foot for 3 seconds',
    'Performs a pencil roll with body tension',
    'Attempts a forward roll with support if needed',
    'Jumps and lands safely on two feet',
    'Uses low apparatus safely with support',
    'Links two simple actions together'
  ],
  'Gymnastics Improver': [
    'Performs a forward roll with control',
    'Attempts a backward roll safely',
    'Performs a controlled cartwheel attempt',
    'Holds a balance shape for 5 seconds',
    'Jumps, lands and freezes with control',
    'Links travel, jump and balance into a sequence',
    'Uses apparatus with safe entry and exit',
    'Works with a partner or small group safely',
    'Shows body tension in shapes and rolls',
    'Remembers and repeats a short routine'
  ],
  'Gymnastics Advanced': [
    'Performs a cartwheel with control and direction',
    'Attempts handstand progressions safely',
    'Links three or more actions smoothly',
    'Shows controlled take-off and landing',
    'Uses levels, direction and speed in a routine',
    'Performs balances with strong body tension',
    'Combines floor and apparatus work safely',
    'Creates a routine with start, middle and finish',
    'Improves performance after feedback',
    'Demonstrates confidence and control throughout'
  ]
};

const GYM_GROUPS = [
  {
    id: 'gym-beg',
    name: 'Gymnastics Beginners',
    detail: 'Foundation shapes, rolls, jumps and safe movement',
    stages: ['Gymnastics Beginner'],
    colour: 'blue',
    programme: PROGRAMME
  },
  {
    id: 'gym-imp',
    name: 'Gymnastics Improvers',
    detail: 'Sequences, rolls, cartwheel progress and apparatus confidence',
    stages: ['Gymnastics Improver'],
    colour: 'orange',
    programme: PROGRAMME
  },
  {
    id: 'gym-adv',
    name: 'Gymnastics Advanced',
    detail: 'Linked routines, handstand progressions and controlled performance',
    stages: ['Gymnastics Advanced'],
    colour: 'gold',
    programme: PROGRAMME
  }
];

const QUICK_GYM = {
  id: 'gymnastics-class',
  title: 'Gymnastics class',
  detail: 'Beginner criteria group',
  programme: PROGRAMME,
  groupTemplateId: 'gym-beg',
  name: 'Gymnastics Beginners',
  school: 'Gymnastics',
  year: 'Class group',
  className: 'Beginners',
  time: '15:30',
  duration: '45'
};

function safeJson(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeRawState(state) {
  const json = JSON.stringify(state);
  try {
    window.localStorage[STATE_KEY] = json;
  } catch {
    try { window.localStorage.setItem(STATE_KEY, json); } catch {}
  }
}

function unique(items) {
  return [...new Set((items || []).filter(Boolean))];
}

function mergeCriteria(existing = {}) {
  const merged = { ...existing };
  Object.entries(GYM_CRITERIA).forEach(([stage, criteria]) => {
    merged[stage] = unique([...(existing[stage] || []), ...criteria]);
  });
  return merged;
}

function mergeGroups(existing = []) {
  const byId = new Map();
  [...GYM_GROUPS, ...(existing || [])].forEach((group) => {
    if (!group?.id) return;
    const base = byId.get(group.id) || {};
    byId.set(group.id, {
      ...base,
      ...group,
      programme: group.programme || base.programme || PROGRAMME,
      stages: unique([...(base.stages || []), ...(group.stages || [])])
    });
  });
  return Array.from(byId.values());
}

function groupIdsForProgramme(programme) {
  return programme === PROGRAMME ? GYM_GROUPS.map((group) => group.id) : null;
}

function normaliseState(state) {
  if (!state || typeof state !== 'object') return state;

  const framework = {
    ...(state.framework || {}),
    stages: unique([...(state.framework?.stages || []), ...GYM_STAGES]),
    criteria: mergeCriteria(state.framework?.criteria || {}),
    groupTemplates: mergeGroups(state.framework?.groupTemplates || [])
  };
  framework.groups = framework.groupTemplates.map((group) => `${group.name}: ${group.detail || ''}`);

  const lessons = Array.isArray(state.lessons) ? state.lessons.map((lesson) => {
    if (lesson.programme !== PROGRAMME) return lesson;
    const allowed = groupIdsForProgramme(PROGRAMME);
    const groupTemplateId = allowed.includes(lesson.groupTemplateId) ? lesson.groupTemplateId : 'gym-beg';
    return {
      ...lesson,
      programme: PROGRAMME,
      school: lesson.school || PROGRAMME,
      className: lesson.className || 'Beginners',
      groupTemplateId,
      mode: lesson.mode || 'Stages + National Curriculum'
    };
  }) : [];

  const lessonsById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const learners = Array.isArray(state.learners) ? state.learners.map((learner) => {
    const lesson = lessonsById.get(learner.lesson);
    if (lesson?.programme !== PROGRAMME) return learner;
    const group = framework.groupTemplates.find((item) => item.id === lesson.groupTemplateId);
    const stage = group?.stages?.[0] || 'Gymnastics Beginner';
    return {
      ...learner,
      stage: GYM_STAGES.includes(learner.stage) ? learner.stage : stage
    };
  }) : [];

  return { ...state, framework, lessons, learners };
}

function syncSavedState() {
  const state = safeJson(STATE_KEY, null);
  if (!state) return false;
  const patched = normaliseState(state);
  const before = JSON.stringify(state);
  const after = JSON.stringify(patched);
  if (before !== after) {
    writeRawState(patched);
    return true;
  }
  return false;
}

function installStoragePatch() {
  if (window.__stageFlowGymnasticsStoragePatch) return;
  window.__stageFlowGymnasticsStoragePatch = true;
  const previousSetItem = Storage.prototype.setItem;
  let writing = false;

  Storage.prototype.setItem = function patchedSetItem(key, value) {
    const result = previousSetItem.call(this, key, value);
    if (key === STATE_KEY && !writing) {
      writing = true;
      try { syncSavedState(); } finally { writing = false; }
    }
    return result;
  };
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function getField(label) {
  return Array.from(document.querySelectorAll('.field')).find((field) =>
    field.querySelector('label')?.textContent?.trim() === label
  );
}

function addOption(select, value, label = value) {
  if (!select || Array.from(select.options).some((option) => option.value === value)) return;
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  select.appendChild(option);
}

function setSelect(label, value, text = value) {
  const select = getField(label)?.querySelector('select');
  if (!select) return false;
  addOption(select, value, text);
  if (select.value === value) return false;
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function setInput(label, value) {
  const input = getField(label)?.querySelector('input, textarea');
  if (!input || input.value === value) return false;
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter ? setter.call(input, value) : input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function patchProgrammeSelects() {
  document.querySelectorAll('.field').forEach((field) => {
    const label = field.querySelector('label')?.textContent?.trim();
    const select = field.querySelector('select');
    if (!select || (label !== 'Programme' && label !== 'Programme filter')) return;
    addOption(select, PROGRAMME);
  });
}

function patchGroupSelect() {
  const programme = getField('Programme')?.querySelector('select')?.value;
  const select = getField('Assessment group')?.querySelector('select');
  if (!select || programme !== PROGRAMME) return;

  GYM_GROUPS.forEach((group) => addOption(select, group.id, `${group.name} — ${group.detail}`));
  const allowed = groupIdsForProgramme(programme);
  Array.from(select.options).forEach((option) => {
    const isAllowed = allowed.includes(option.value);
    option.hidden = !isAllowed;
    option.disabled = !isAllowed;
  });
  if (!allowed.includes(select.value)) {
    select.value = 'gym-beg';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function addLessonSetupNote() {
  const panel = Array.from(document.querySelectorAll('.card')).find((card) =>
    card.querySelector('h2')?.textContent?.trim() === 'Lesson setup'
  );
  if (!panel || panel.querySelector('[data-stageflow-gym-note]')) return;
  const note = document.createElement('div');
  note.className = 'folder gym-note';
  note.dataset.stageflowGymNote = 'true';
  note.innerHTML = '<strong>Gymnastics now has its own criteria.</strong><p class="muted">Choose Gymnastics as the programme, then pick Beginners, Improvers or Advanced. These are separate from swim stages.</p>';
  panel.appendChild(note);
}

function quickAddButtonExists(container) {
  return !!container?.querySelector('[data-stageflow-quick-gymnastics]');
}

function addQuickGymnasticsButton() {
  const quick = document.querySelector('[data-stageflow-quick-sessions] .quick-actions') ||
    Array.from(document.querySelectorAll('.card')).find((card) => card.querySelector('h2')?.textContent?.trim() === 'Quick add')?.querySelector('.quick-actions');
  if (!quick || quickAddButtonExists(quick)) return;
  const button = document.createElement('button');
  button.className = 'action-card gym-quick-card';
  button.dataset.stageflowQuickGymnastics = 'true';
  button.innerHTML = `<span>${escapeHtml(QUICK_GYM.title)}</span><small>${escapeHtml(QUICK_GYM.detail)}</small>`;
  button.addEventListener('click', () => createQuickGymnasticsSession());
  quick.appendChild(button);
}

function findAddSessionButton() {
  return Array.from(document.querySelectorAll('button')).find((button) => {
    const text = (button.textContent || '').trim();
    return text === '+ Add class/session' || text === '+ Add group lesson' || text.includes('Add class/session');
  });
}

function createQuickGymnasticsSession() {
  syncSavedState();
  const button = findAddSessionButton();
  if (!button) return;
  button.click();
  window.setTimeout(() => {
    setSelect('Programme', QUICK_GYM.programme);
    window.setTimeout(() => {
      syncSavedState();
      setSelect('Assessment group', QUICK_GYM.groupTemplateId, 'Gymnastics Beginners — Foundation shapes, rolls, jumps and safe movement');
      setInput('Lesson name', QUICK_GYM.name);
      setInput('School / venue', QUICK_GYM.school);
      setInput('Year / class', QUICK_GYM.year);
      setInput('Coach', 'Lewis');
      setInput('Start time', QUICK_GYM.time);
      setSelect('Duration', QUICK_GYM.duration, `${QUICK_GYM.duration} minutes`);
      window.setTimeout(() => {
        const changed = syncSavedState();
        if (changed && !sessionStorage.getItem(RELOAD_KEY)) {
          sessionStorage.setItem(RELOAD_KEY, '1');
          window.location.reload();
        }
      }, 250);
    }, 120);
  }, 120);
}

function addSettingsSummary() {
  const groupsPanel = Array.from(document.querySelectorAll('.card')).find((card) =>
    card.querySelector('h2')?.textContent?.trim() === 'Criteria groups' ||
    card.querySelector('h2')?.textContent?.trim() === 'Assessment groups'
  );
  if (!groupsPanel || groupsPanel.querySelector('[data-stageflow-gym-summary]')) return;
  const summary = document.createElement('div');
  summary.className = 'folder gym-summary';
  summary.dataset.stageflowGymSummary = 'true';
  summary.innerHTML = `
    <strong>Gymnastics criteria added</strong>
    <p class="muted">Beginners, Improvers and Advanced are available as separate criteria groups from swimming.</p>
    <small>${GYM_STAGES.map(escapeHtml).join(' · ')}</small>
  `;
  groupsPanel.insertBefore(summary, groupsPanel.querySelector('button') || groupsPanel.firstChild);
}

function addStyle() {
  if (document.getElementById('stageflow-gymnastics-style')) return;
  const style = document.createElement('style');
  style.id = 'stageflow-gymnastics-style';
  style.textContent = `
    .gym-quick-card,
    .gym-note,
    .gym-summary {
      border-left-color: #7c3aed !important;
      background: linear-gradient(180deg, #faf5ff, #fff) !important;
    }
    .gym-quick-card {
      box-shadow: inset 0 -4px 0 #7c3aed !important;
    }
    .gym-summary small {
      display: block;
      color: #64748b;
      font-weight: 850;
      margin-top: 4px;
    }
  `;
  document.head.appendChild(style);
}

function tick() {
  addStyle();
  patchProgrammeSelects();
  patchGroupSelect();
  addLessonSetupNote();
  addQuickGymnasticsButton();
  addSettingsSummary();
}

installStoragePatch();
const changed = syncSavedState();
if (changed && !sessionStorage.getItem(RELOAD_KEY)) {
  sessionStorage.setItem(RELOAD_KEY, '1');
  window.location.reload();
}

window.addEventListener('load', tick);
document.addEventListener('change', (event) => {
  const label = event.target.closest('.field')?.querySelector('label')?.textContent?.trim();
  if (label === 'Programme' || label === 'Assessment group') {
    window.setTimeout(() => { syncSavedState(); tick(); }, 60);
  }
}, true);
new MutationObserver(tick).observe(document.documentElement, { childList: true, subtree: true });
setTimeout(tick, 250);
setTimeout(tick, 900);
