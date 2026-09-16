const STATE_KEY = 'stageflow-state';
const RELOAD_KEY = 'stageflow-activity-programme-polish-v1';
const SCHOOL_PE = 'School PE';
const GYMNASTICS = 'Gymnastics';
const SCHOOL_SWIM = 'School Swimming';
const EVENING_GROUP = 'Evening Swim Group';
const EVENING_121 = 'Evening Swim 1:1';
const PRIVATE = 'Private Lessons';

const PE_STAGES = ['PE Fundamentals', 'PE Games Skills', 'PE Teamwork & Leadership'];

const PE_CRITERIA = {
  'PE Fundamentals': [
    'Listens to instructions and follows safety rules',
    'Finds and uses space safely during activities',
    'Joins in with warm-up and cool-down activities',
    'Moves in different ways with control',
    'Changes speed and direction safely',
    'Balances using different body shapes',
    'Throws underarm towards a target',
    'Catches a large ball with control',
    'Uses equipment safely and respectfully',
    'Shows fair play and encourages others'
  ],
  'PE Games Skills': [
    'Passes accurately to a partner',
    'Receives or controls a ball safely',
    'Travels with equipment under control',
    'Moves into space to support a teammate',
    'Marks or defends a space safely',
    'Aims at a target with improving accuracy',
    'Understands simple attacking and defending roles',
    'Takes turns and follows the rules of a game',
    'Adapts after coach feedback',
    'Works as part of a team'
  ],
  'PE Teamwork & Leadership': [
    'Explains a simple tactic or game plan',
    'Leads or demonstrates a short activity safely',
    'Communicates clearly with teammates',
    'Uses attacking and defending decisions in a game',
    'Shows resilience after mistakes',
    'Helps set up or tidy equipment safely',
    'Supports another learner positively',
    'Reflects on what went well and what to improve',
    'Applies rules consistently during game play',
    'Shows confidence and control in competitive activities'
  ]
};

const PE_GROUPS = [
  {
    id: 'pe-fund',
    name: 'PE Fundamentals',
    detail: 'Movement, safety, coordination and basic equipment skills',
    stages: ['PE Fundamentals'],
    colour: 'blue',
    programme: SCHOOL_PE
  },
  {
    id: 'pe-games',
    name: 'PE Games Skills',
    detail: 'Passing, receiving, targets, attacking and defending',
    stages: ['PE Games Skills'],
    colour: 'orange',
    programme: SCHOOL_PE
  },
  {
    id: 'pe-team',
    name: 'PE Teamwork & Leadership',
    detail: 'Tactics, communication, reflection and leadership',
    stages: ['PE Teamwork & Leadership'],
    colour: 'gold',
    programme: SCHOOL_PE
  }
];

const PROGRAMME_GROUPS = {
  [SCHOOL_SWIM]: ['g1', 'g2', 'g3'],
  [EVENING_GROUP]: ['eg1', 'eg2', 'eg3'],
  [EVENING_121]: ['eg121'],
  [PRIVATE]: ['eg121'],
  [GYMNASTICS]: ['gym-beg', 'gym-imp', 'gym-adv'],
  [SCHOOL_PE]: ['pe-fund', 'pe-games', 'pe-team']
};

const QUICK_PE = {
  title: 'School PE class',
  detail: 'PE criteria and register',
  programme: SCHOOL_PE,
  groupTemplateId: 'pe-fund',
  name: 'School PE Class',
  school: 'New School',
  year: 'Year group',
  className: 'PE group',
  coach: 'Lewis',
  time: '13:00',
  duration: '45'
};

function unique(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function read(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeState(state) {
  try {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {}
}

function normaliseProgramme(value) {
  const text = String(value || '').trim();
  const lower = text.toLowerCase();
  if (!text) return SCHOOL_SWIM;
  if (lower === 'evening swim lessons' || lower === 'evening swim group') return EVENING_GROUP;
  if (lower.includes('1:1') || lower.includes('121') || lower.includes('one-to-one') || lower.includes('one to one')) return EVENING_121;
  if (lower.includes('private')) return PRIVATE;
  if (lower.includes('gym')) return GYMNASTICS;
  if (lower.includes('pe')) return SCHOOL_PE;
  return text;
}

function programmeFromGroup(group = {}) {
  if (group.programme) return normaliseProgramme(group.programme);
  if (String(group.id || '').startsWith('pe-')) return SCHOOL_PE;
  if (String(group.id || '').startsWith('gym-')) return GYMNASTICS;
  if (group.id === 'eg121') return EVENING_121;
  if (String(group.id || '').startsWith('eg')) return EVENING_GROUP;
  if (['g1', 'g2', 'g3'].includes(group.id)) return SCHOOL_SWIM;
  return SCHOOL_SWIM;
}

function mergeCriteria(criteria = {}) {
  const next = { ...criteria };
  Object.entries(PE_CRITERIA).forEach(([section, criteriaList]) => {
    next[section] = unique([...(next[section] || []), ...criteriaList]);
  });
  return next;
}

function mergeGroupTemplates(existing = []) {
  const map = new Map();
  [...PE_GROUPS, ...(Array.isArray(existing) ? existing : [])].forEach(group => {
    if (!group?.id) return;
    const previous = map.get(group.id) || {};
    map.set(group.id, {
      ...previous,
      ...group,
      programme: programmeFromGroup({ ...previous, ...group }),
      stages: unique([...(previous.stages || []), ...(group.stages || [])])
    });
  });
  return Array.from(map.values());
}

function normaliseState(state) {
  if (!state || typeof state !== 'object') return state;

  const framework = {
    ...(state.framework || {}),
    stages: unique([...(state.framework?.stages || []), ...PE_STAGES]),
    criteria: mergeCriteria(state.framework?.criteria || {}),
    groupTemplates: mergeGroupTemplates(state.framework?.groupTemplates || [])
  };
  framework.groups = framework.groupTemplates.map(group => `${group.name}: ${group.detail || ''}`);

  const lessons = Array.isArray(state.lessons)
    ? state.lessons.map(lesson => {
        const programme = normaliseProgramme(lesson.programme || lesson.school || lesson.name);
        const allowed = PROGRAMME_GROUPS[programme];
        const groupTemplateId = allowed && !allowed.includes(lesson.groupTemplateId)
          ? allowed[0]
          : lesson.groupTemplateId;
        return {
          ...lesson,
          programme,
          school: lesson.school || (programme === SCHOOL_PE ? 'New School' : programme),
          groupTemplateId,
          mode: lesson.mode || 'Stages + National Curriculum'
        };
      })
    : [];

  const lessonsById = new Map(lessons.map(lesson => [lesson.id, lesson]));
  const groupById = new Map(framework.groupTemplates.map(group => [group.id, group]));
  const learners = Array.isArray(state.learners)
    ? state.learners.map(learner => {
        const lesson = lessonsById.get(learner.lesson);
        if (lesson?.programme !== SCHOOL_PE) return learner;
        const stage = groupById.get(lesson.groupTemplateId)?.stages?.[0] || 'PE Fundamentals';
        return {
          ...learner,
          stage: PE_STAGES.includes(learner.stage) ? learner.stage : stage
        };
      })
    : [];

  return { ...state, framework, lessons, learners };
}

function installStoragePatch() {
  if (window.__stageFlowActivityProgrammePolishStorage) return;
  window.__stageFlowActivityProgrammePolishStorage = true;
  const original = Storage.prototype.setItem;
  let busy = false;
  Storage.prototype.setItem = function patchedSetItem(key, value) {
    if (key === STATE_KEY && typeof value === 'string' && !busy) {
      try {
        busy = true;
        value = JSON.stringify(normaliseState(JSON.parse(value)));
      } catch {
      } finally {
        busy = false;
      }
    }
    return original.call(this, key, value);
  };
}

function upgradeExistingState() {
  const current = read(STATE_KEY, null);
  if (!current) return false;
  const next = normaliseState(current);
  if (JSON.stringify(current) === JSON.stringify(next)) return false;
  writeState(next);
  return true;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function textOnly(element) {
  return element?.childNodes.length === 1 && element.firstChild?.nodeType === Node.TEXT_NODE;
}

function replaceExactText() {
  const swaps = new Map([
    ['Lesson setup', 'Class/session setup'],
    ['Programme', 'Activity / programme'],
    ['Assessment group', 'Criteria group'],
    ['Choose the group first. Assess that group criteria.', 'Build the session first. Then assess its criteria.'],
    ['No separate initial assessment screen. The group is the assessment level.', 'Choose the activity, day, time and criteria group for this class/session.'],
    ['Pick the programme and group. Every swimmer in this lesson will be assessed against this group’s criteria.', 'Pick the activity and criteria group. Everyone in this class/session is assessed against that criteria set.'],
    ['Group criteria preview', 'Criteria group preview'],
    ['Register swimmers', 'Register names'],
    ['Add swimmers', 'Add names'],
    ['Swimmers', 'Names'],
    ['Use today’s group criteria', 'Use today’s criteria group']
  ]);

  document.querySelectorAll('h1,h2,h3,p,small,span,label,button,option,b').forEach(element => {
    if (!textOnly(element)) return;
    const text = element.textContent.trim();
    if (swaps.has(text)) element.textContent = swaps.get(text);
  });
}

function findField(labels = []) {
  return Array.from(document.querySelectorAll('.field')).find(field => {
    const label = field.querySelector('label')?.textContent?.trim();
    return labels.includes(label);
  });
}

function addOption(select, value, label = value) {
  if (!select || Array.from(select.options).some(option => option.value === value)) return;
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  select.appendChild(option);
}

function setSelect(labels, value, label = value) {
  const select = findField(labels)?.querySelector('select');
  if (!select) return false;
  addOption(select, value, label);
  if (select.value === value) return false;
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function setInput(labels, value) {
  const input = findField(labels)?.querySelector('input, textarea');
  if (!input || input.value === value) return false;
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function ensureProgrammeOptions() {
  document.querySelectorAll('.field').forEach(field => {
    const label = field.querySelector('label')?.textContent?.trim();
    const select = field.querySelector('select');
    if (!select) return;
    if (['Programme', 'Activity / programme', 'Programme filter'].includes(label)) {
      [SCHOOL_SWIM, EVENING_GROUP, EVENING_121, PRIVATE, SCHOOL_PE, GYMNASTICS, 'Custom'].forEach(programme => addOption(select, programme));
      Array.from(select.options).forEach(option => {
        option.value = normaliseProgramme(option.value);
        option.textContent = normaliseProgramme(option.textContent);
      });
    }
  });
}

function filterCriteriaGroups() {
  const programme = normaliseProgramme(findField(['Programme', 'Activity / programme'])?.querySelector('select')?.value);
  const select = findField(['Assessment group', 'Criteria group'])?.querySelector('select');
  if (!select || !programme) return;

  PE_GROUPS.forEach(group => addOption(select, group.id, `${group.name} — ${group.detail}`));

  const allowed = PROGRAMME_GROUPS[programme];
  if (!allowed) return;

  Array.from(select.options).forEach(option => {
    const visible = allowed.includes(option.value);
    option.hidden = !visible;
    option.disabled = !visible;
  });

  if (!allowed.includes(select.value)) {
    select.value = allowed[0];
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function addSetupGuide() {
  const card = Array.from(document.querySelectorAll('.card')).find(card => {
    const heading = card.querySelector('h2')?.textContent?.trim();
    return heading === 'Class/session setup' || heading === 'Lesson setup';
  });
  if (!card || card.querySelector('[data-stageflow-activity-guide]')) return;

  const guide = document.createElement('div');
  guide.className = 'folder activity-guide';
  guide.dataset.stageflowActivityGuide = 'true';
  guide.innerHTML = `
    <strong>Class/session = the timetable slot.</strong>
    <p class="muted">Activity / programme decides what kind of session it is. Criteria group decides what skills appear when you assess.</p>
  `;
  const paragraph = card.querySelector('p');
  paragraph ? paragraph.insertAdjacentElement('afterend', guide) : card.prepend(guide);
}

function addSettingsSummary() {
  const card = Array.from(document.querySelectorAll('.card')).find(card => {
    const heading = card.querySelector('h2')?.textContent?.trim();
    return heading === 'Criteria groups' || heading === 'Assessment groups';
  });
  if (!card || card.querySelector('[data-stageflow-pe-summary]')) return;

  const summary = document.createElement('div');
  summary.className = 'folder pe-summary';
  summary.dataset.stageflowPeSummary = 'true';
  summary.innerHTML = `
    <strong>School PE criteria added</strong>
    <p class="muted">PE now has Fundamentals, Games Skills, and Teamwork & Leadership groups. These stay separate from swimming and gymnastics.</p>
  `;
  const button = card.querySelector('button');
  button ? button.insertAdjacentElement('afterend', summary) : card.prepend(summary);
}

function findAddSessionButton() {
  return Array.from(document.querySelectorAll('button')).find(button => {
    const text = (button.textContent || '').trim();
    return text === '+ Add class/session' || text === '+ Add group lesson' || text.includes('Add class/session');
  });
}

function addQuickPECard() {
  const quickGrid = document.querySelector('[data-stageflow-quick-sessions] .quick-actions')
    || Array.from(document.querySelectorAll('.card')).find(card => card.querySelector('h2')?.textContent?.trim() === 'Quick add')?.querySelector('.quick-actions');
  if (!quickGrid || quickGrid.querySelector('[data-stageflow-quick-pe]')) return;

  const card = document.createElement('button');
  card.className = 'action-card pe-quick-card';
  card.dataset.stageflowQuickPe = 'true';
  card.innerHTML = `<span>${escapeHtml(QUICK_PE.title)}</span><small>${escapeHtml(QUICK_PE.detail)}</small>`;
  card.addEventListener('click', quickAddPE);
  quickGrid.appendChild(card);
}

function quickAddPE() {
  upgradeExistingState();
  const button = findAddSessionButton();
  if (!button) return;
  button.click();
  window.setTimeout(() => {
    setSelect(['Programme', 'Activity / programme'], QUICK_PE.programme);
    window.setTimeout(() => {
      upgradeExistingState();
      setSelect(['Assessment group', 'Criteria group'], QUICK_PE.groupTemplateId, 'PE Fundamentals — Movement, safety, coordination and basic equipment skills');
      setInput(['Lesson name'], QUICK_PE.name);
      setInput(['School / venue'], QUICK_PE.school);
      setInput(['Year / class'], QUICK_PE.year);
      setInput(['Coach'], QUICK_PE.coach);
      setInput(['Start time'], QUICK_PE.time);
      setSelect(['Duration'], QUICK_PE.duration, `${QUICK_PE.duration} minutes`);
      window.setTimeout(() => {
        if (upgradeExistingState() && !sessionStorage.getItem(RELOAD_KEY)) {
          sessionStorage.setItem(RELOAD_KEY, '1');
          window.location.reload();
        }
      }, 250);
    }, 120);
  }, 120);
}

function addStyles() {
  if (document.getElementById('stageflow-activity-programme-polish-style')) return;
  const style = document.createElement('style');
  style.id = 'stageflow-activity-programme-polish-style';
  style.textContent = `
    .activity-guide,
    .pe-summary,
    .pe-quick-card {
      border-left-color: #2563eb !important;
      background: linear-gradient(180deg, #eff6ff, #ffffff) !important;
    }
    .pe-quick-card {
      box-shadow: inset 0 -4px 0 #2563eb !important;
    }
    .field label { line-height: 1.2; }
    select option[hidden] { display: none; }
  `;
  document.head.appendChild(style);
}

function run() {
  addStyles();
  replaceExactText();
  ensureProgrammeOptions();
  filterCriteriaGroups();
  addSetupGuide();
  addSettingsSummary();
  addQuickPECard();
}

installStoragePatch();
if (upgradeExistingState() && !sessionStorage.getItem(RELOAD_KEY)) {
  sessionStorage.setItem(RELOAD_KEY, '1');
  window.location.reload();
}
window.addEventListener('load', run);
document.addEventListener('change', event => {
  const label = event.target.closest('.field')?.querySelector('label')?.textContent?.trim();
  if (['Programme', 'Activity / programme', 'Assessment group', 'Criteria group'].includes(label)) {
    window.setTimeout(() => {
      upgradeExistingState();
      run();
    }, 60);
  }
}, true);
new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
setTimeout(run, 250);
setTimeout(run, 900);
