const ONE_TO_ONE = 'Evening Swim 1:1';
const EVENING_GROUP = 'Evening Swim Group';
const SCHOOL_SWIM = 'School Swimming';
const PRIVATE_LESSONS = 'Private Lessons';
const ONE_TO_ONE_GROUP_ID = 'eg121';
const STATE_KEY = 'stageflow-state';

const ALL_SWIM_STAGES = ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5', 'Stage 6', 'Stage 7', 'Self Rescue Award'];

const JB_SWIM_CRITERIA = {
  'Stage 1': [
    'Enter the water safely from poolside',
    'Exit the water safely without using the steps if able',
    'Move forwards, backwards and sideways with confidence',
    'Scoop water and wash face confidently',
    'Blow bubbles with mouth and nose in the water',
    'Float on front with support and return to standing',
    'Float on back with support and return to standing',
    'Travel 5m on front with support if needed',
    'Travel 5m on back with support if needed',
    'Show safe pool rules and listening skills'
  ],
  'Stage 2': [
    'Jump in safely from poolside and return to the wall',
    'Float on front without support and return to standing',
    'Float on back without support and return to standing',
    'Push and glide on front with face in the water',
    'Push and glide on back with arms extended',
    'Travel 5m front crawl action',
    'Travel 5m backstroke action',
    'Rotate from front to back and recover',
    'Rotate from back to front and recover',
    'Tread water or vertical scull for 10 seconds'
  ],
  'Stage 3': [
    'Submerge fully and regain standing position',
    'Pick up an object from shallow water',
    'Perform and hold a mushroom float for 5 seconds',
    'Push and glide then swim 10m on front',
    'Push and glide then swim 10m on back',
    'Swim 10m front crawl with face in and breathing attempt',
    'Swim 10m backstroke with relaxed body position',
    'Kick 10m breaststroke legs with float if needed',
    'Kick 10m butterfly legs with float if needed',
    'Tread water for 20 seconds',
    'Explain how to get help if in difficulty'
  ],
  'Stage 4': [
    'Jump in, submerge, surface and swim back to the side',
    'Push and glide towards the pool floor with control',
    'Perform a floating sequence of at least 3 shapes',
    'Swim 15m front crawl with recognisable technique',
    'Swim 15m backstroke with recognisable technique',
    'Swim 10m breaststroke with recognisable leg action',
    'Swim 10m butterfly or butterfly kick with rhythm',
    'Swim 5m on front, tuck, rotate onto back and return to the side',
    'Perform a shout and signal rescue',
    'Climb out safely without using steps'
  ],
  'Stage 5': [
    'Jump into full reach depth, surface and return to point of entry',
    'Perform a stationary scull on the back',
    'Swim 25m front crawl with consistent breathing attempt',
    'Swim 25m backstroke with consistent body position',
    'Swim 15m breaststroke with timing attempt',
    'Swim 15m butterfly or butterfly kick with rhythm',
    'Kick 10m front crawl with good body position',
    'Kick 10m backstroke with good body position',
    'Travel on front and log roll onto back in one continuous movement',
    'Travel on back and log roll onto front in one continuous movement',
    'Tread water for 30 seconds',
    'Explain where it is safe to swim and why'
  ],
  'Stage 6': [
    'Perform three different shaped jumps into deep water',
    'Perform a head-first scull for 5m',
    'Swim 50m front crawl with controlled breathing',
    'Swim 50m backstroke with good body position',
    'Swim 25m breaststroke with rhythm and timing',
    'Swim 15m butterfly with rhythm or strong butterfly kick',
    'Swim 100m continuously using at least two strokes',
    'Tread water for 60 seconds',
    'Swim 10m wearing shorts and t-shirt',
    'Exit deep water without using steps',
    'Complete all National Curriculum swimming requirements'
  ],
  'Stage 7': [
    'Swim 100m continuously using a minimum of three strokes',
    'Swim 50m front crawl with consistent technique',
    'Swim 50m backstroke with consistent technique',
    'Swim 50m breaststroke with consistent technique',
    'Swim 25m butterfly or butterfly kick with rhythm',
    'Perform a streamlined push and glide into stroke',
    'Perform a legal turn for at least two strokes',
    'Tread water for 90 seconds',
    'Perform a racing start or controlled deep-water entry where appropriate',
    'Complete a longer water safety and self-rescue challenge'
  ],
  'Self Rescue Award': [
    'Enter the water using a safe fall-in entry',
    'Float on back or scull calmly to control breathing',
    'Tread water for 20 seconds with one arm raised and shout for help',
    'Swim 15m on front, rotate, then swim 15m on back to a floating object',
    'Demonstrate the Heat Escape Lessening Position - HELP',
    'Swim 10m while retaining a floating object',
    'Demonstrate the Huddle position with a group',
    'Swim using a long-arm front paddle survival stroke to the side',
    'Climb out of the water without using steps',
    'Explain when these self-rescue skills could be used in real situations'
  ]
};

const DEFAULT_GROUPS = [
  { id: 'g1', name: 'School Group 1', detail: 'Stages 1-3', stages: ['Stage 1', 'Stage 2', 'Stage 3'], colour: 'blue', programme: SCHOOL_SWIM },
  { id: 'g2', name: 'School Group 2', detail: 'Stages 4-5', stages: ['Stage 4', 'Stage 5'], colour: 'orange', programme: SCHOOL_SWIM },
  { id: 'g3', name: 'School Group 3', detail: 'Stage 6 + Self Rescue', stages: ['Stage 6', 'Self Rescue Award'], colour: 'gold', programme: SCHOOL_SWIM },
  { id: 'eg1', name: 'Evening Swim Group 1', detail: 'Stages 1-3', stages: ['Stage 1', 'Stage 2', 'Stage 3'], colour: 'blue', programme: EVENING_GROUP },
  { id: 'eg2', name: 'Evening Swim Group 2', detail: 'Stages 4-5', stages: ['Stage 4', 'Stage 5'], colour: 'orange', programme: EVENING_GROUP },
  { id: 'eg3', name: 'Evening Swim Group 3', detail: 'Stages 6-7', stages: ['Stage 6', 'Stage 7'], colour: 'gold', programme: EVENING_GROUP },
  { id: ONE_TO_ONE_GROUP_ID, name: 'Evening Swim 1:1', detail: 'All stages visible', stages: ALL_SWIM_STAGES, colour: 'gold', programme: ONE_TO_ONE, allStages: true }
];

const PROGRAMME_DEFAULT_GROUP = {
  [SCHOOL_SWIM]: 'g1',
  [EVENING_GROUP]: 'eg1',
  [ONE_TO_ONE]: ONE_TO_ONE_GROUP_ID,
  [PRIVATE_LESSONS]: ONE_TO_ONE_GROUP_ID
};

const PROGRAMME_GROUPS = {
  [SCHOOL_SWIM]: ['g1', 'g2', 'g3'],
  [EVENING_GROUP]: ['eg1', 'eg2', 'eg3'],
  [ONE_TO_ONE]: [ONE_TO_ONE_GROUP_ID],
  [PRIVATE_LESSONS]: [ONE_TO_ONE_GROUP_ID]
};

const QUICK_SESSIONS = [
  { id: 'school', title: 'School swim class', detail: 'School, day, group criteria', programme: SCHOOL_SWIM, groupTemplateId: 'g1', name: 'New School Swim Class', school: 'New School', year: 'Year group', className: 'Group 1', time: '09:00', duration: '30' },
  { id: 'evening-group', title: 'Evening swim group', detail: 'Shared evening criteria group', programme: EVENING_GROUP, groupTemplateId: 'eg1', name: 'Evening Swim Group', school: EVENING_GROUP, year: 'Evening swimmers', className: 'Stage 1-3', time: '17:00', duration: '30' },
  { id: 'evening-121', title: 'Evening swim 1:1', detail: 'All stages visible', programme: ONE_TO_ONE, groupTemplateId: ONE_TO_ONE_GROUP_ID, name: 'Evening Swim 1:1', school: ONE_TO_ONE, year: '1:1 swimmer', className: 'All stages', time: '17:30', duration: '30' }
];

function getFieldByLabel(labelText) {
  return Array.from(document.querySelectorAll('.field')).find(field => field.querySelector('label')?.textContent?.trim() === labelText);
}

function ensureOption(select, value, label = value) {
  if (!select || Array.from(select.options).some(option => option.value === value)) return;
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  select.appendChild(option);
}

function setNativeSelectValue(select, value) {
  if (!select || select.value === value) return false;
  ensureOption(select, value);
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function setNativeInputValue(input, value) {
  if (!input || input.value === value) return false;
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function setSelectField(label, value, optionLabel = value) {
  const select = getFieldByLabel(label)?.querySelector('select');
  ensureOption(select, value, optionLabel);
  return setNativeSelectValue(select, value);
}

function setInputField(label, value) {
  const input = getFieldByLabel(label)?.querySelector('input, textarea');
  return setNativeInputValue(input, value);
}

function normaliseLegacyEveningProgramme(value) {
  if (value === 'Evening Swim Lessons') return EVENING_GROUP;
  if (value === 'Evening Swim 121' || value === 'Evening 1:1' || value === 'Evening Swim One-to-one') return ONE_TO_ONE;
  return value;
}

function allowedGroupsForProgramme(programme) { return PROGRAMME_GROUPS[normaliseLegacyEveningProgramme(programme)] || null; }
function defaultGroupForProgramme(programme) { return PROGRAMME_DEFAULT_GROUP[normaliseLegacyEveningProgramme(programme)] || ''; }

function allFrameworkCriteria(state) {
  return Object.values(state?.framework?.criteria || JB_SWIM_CRITERIA).flat();
}

function criterionMetres(text) {
  const lower = String(text || '').toLowerCase();
  const match = lower.match(/(\d+)\s*m/);
  if (match) return Number(match[1]);
  if (lower.includes('one width') || lower.includes('one length')) return 25;
  return 0;
}

function criterionStroke(text) {
  const lower = String(text || '').toLowerCase();
  if (lower.includes('front crawl') || lower.includes('on front') || lower.includes('on the front') || lower.includes('front with')) return 'front';
  if (lower.includes('backstroke') || lower.includes('on back') || lower.includes('on the back') || lower.includes('back with')) return 'back';
  if (lower.includes('breaststroke') || lower.includes('breast stroke')) return 'breaststroke';
  if (lower.includes('butterfly') || lower.includes('fly kick')) return 'butterfly';
  return '';
}

function isSwimDistanceCriteria(text) {
  const lower = String(text || '').toLowerCase();
  if (!criterionStroke(lower)) return false;
  if (!(criterionMetres(lower) > 0 || lower.includes('one width') || lower.includes('one length'))) return false;
  if (lower.includes('float') || lower.includes('push and glide') || lower.includes('rotate from') || lower.includes('log roll')) return false;
  return /(swim|travel|kick|distance|width|length|front crawl|backstroke|breaststroke|butterfly)/.test(lower);
}

function linkedCriteriaFor(sourceCriteria, allCriteria) {
  const sourceStroke = criterionStroke(sourceCriteria);
  const sourceMetres = criterionMetres(sourceCriteria);
  if (!sourceStroke || !sourceMetres) return [];
  return allCriteria.filter(criteria => {
    if (!isSwimDistanceCriteria(criteria)) return false;
    if (criterionStroke(criteria) !== sourceStroke) return false;
    return criterionMetres(criteria) <= sourceMetres;
  });
}

function maxDistanceValue(current, metres) {
  const existing = Number(String(current || '0').replace('m', '')) || 0;
  return `${Math.max(existing, metres)}m`;
}

function applyNationalCurriculumAutoPass(learner, stroke, metres) {
  const nc = { ...(learner.nc || {}) };
  if (stroke === 'front' && metres >= 25) nc['25m front crawl'] = true;
  if (stroke === 'back' && metres >= 25) nc['25m backstroke'] = true;
  if ((stroke === 'breaststroke' || stroke === 'butterfly') && metres >= 10) nc['10m butterfly or breaststroke'] = true;
  return nc;
}

function applyAutoPassToLearner(state, learner) {
  const allCriteria = allFrameworkCriteria(state);
  let changed = false;
  const res = { ...(learner.res || {}) };
  const dist = { ...(learner.dist || { front: '0m', back: '0m' }) };
  let nc = { ...(learner.nc || {}) };

  Object.entries(res).forEach(([criteria, value]) => {
    if (value !== 'pass') return;
    const stroke = criterionStroke(criteria);
    const metres = criterionMetres(criteria);
    if (!stroke || !metres) return;

    linkedCriteriaFor(criteria, allCriteria).forEach(linked => {
      if (res[linked] !== 'pass') {
        res[linked] = 'pass';
        changed = true;
      }
    });

    if (stroke === 'front') {
      const next = maxDistanceValue(dist.front, metres);
      if (next !== dist.front) { dist.front = next; changed = true; }
    }
    if (stroke === 'back') {
      const next = maxDistanceValue(dist.back, metres);
      if (next !== dist.back) { dist.back = next; changed = true; }
    }

    const nextNc = applyNationalCurriculumAutoPass({ ...learner, nc }, stroke, metres);
    if (JSON.stringify(nextNc) !== JSON.stringify(nc)) {
      nc = nextNc;
      changed = true;
    }
  });

  return changed ? { ...learner, res, dist, nc } : learner;
}

function mergeDefaultGroups(groupTemplates = []) {
  const map = new Map(DEFAULT_GROUPS.map(group => [group.id, group]));
  groupTemplates.forEach(group => {
    const fallback = map.get(group.id);
    map.set(group.id, fallback ? { ...fallback, ...group, stages: group.id === ONE_TO_ONE_GROUP_ID ? ALL_SWIM_STAGES : (fallback.stages || group.stages || []) } : group);
  });
  return Array.from(map.values());
}

function migrateState(state) {
  if (!state || typeof state !== 'object') return state;
  const framework = {
    ...(state.framework || {}),
    name: 'JB Swimming Assessment Framework',
    scoringSystem: 'jbSwimming',
    stages: ALL_SWIM_STAGES,
    criteria: JB_SWIM_CRITERIA,
    groupTemplates: mergeDefaultGroups(state.framework?.groupTemplates || [])
  };
  framework.groups = framework.groupTemplates.map(group => `${group.name}: ${group.detail || ''}`);

  let lessons = Array.isArray(state.lessons) ? state.lessons.map(lesson => {
    const programme = normaliseLegacyEveningProgramme(lesson.programme);
    const allowed = allowedGroupsForProgramme(programme);
    const defaultGroup = defaultGroupForProgramme(programme);
    let next = programme !== lesson.programme ? { ...lesson, programme } : lesson;
    if (allowed && !allowed.includes(next.groupTemplateId)) next = { ...next, groupTemplateId: defaultGroup || allowed[0] };
    if (next.programme === ONE_TO_ONE || next.programme === PRIVATE_LESSONS) next = { ...next, groupTemplateId: ONE_TO_ONE_GROUP_ID, school: next.programme, className: next.className || 'All stages' };
    return next;
  }) : [];

  const learners = Array.isArray(state.learners)
    ? state.learners.map(learner => applyAutoPassToLearner({ ...state, framework }, learner))
    : [];

  return { ...state, framework, lessons, learners };
}

function normaliseStateJson(value) {
  try {
    const state = JSON.parse(value);
    return JSON.stringify(migrateState(state));
  } catch {
    return value;
  }
}

function installStateInterceptor() {
  if (window.__stageFlowAutoPassInstalled) return;
  window.__stageFlowAutoPassInstalled = true;
  const nativeSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function patchedSetItem(key, value) {
    const nextValue = key === STATE_KEY && typeof value === 'string' ? normaliseStateJson(value) : value;
    return nativeSetItem.call(this, key, nextValue);
  };
}

function patchSavedState() {
  try {
    const text = window.localStorage.getItem(STATE_KEY);
    if (!text) return;
    const migrated = normaliseStateJson(text);
    if (migrated !== text) window.localStorage.setItem(STATE_KEY, migrated);
  } catch {
    // Leave user data alone if localStorage is unavailable or malformed.
  }
}

function patchProgrammeSelects() {
  document.querySelectorAll('.field').forEach(field => {
    const label = field.querySelector('label')?.textContent?.trim();
    const select = field.querySelector('select');
    if (!select) return;
    if (label === 'Programme' || label === 'Programme filter') {
      ensureOption(select, ONE_TO_ONE);
      ensureOption(select, EVENING_GROUP);
      Array.from(select.options).forEach(option => {
        if (option.value === 'Evening Swim Lessons') {
          option.value = EVENING_GROUP;
          option.textContent = EVENING_GROUP;
        }
      });
      const normalised = normaliseLegacyEveningProgramme(select.value);
      if (normalised !== select.value) setNativeSelectValue(select, normalised);
    }
  });
}

function patchGroupSelectForProgramme() {
  const programmeField = getFieldByLabel('Programme');
  const groupField = getFieldByLabel('Assessment group');
  const programme = programmeField?.querySelector('select')?.value;
  const groupSelect = groupField?.querySelector('select');
  if (!programme || !groupSelect) return;

  ensureOption(groupSelect, ONE_TO_ONE_GROUP_ID, 'Evening Swim 1:1 — All stages visible');

  const allowed = allowedGroupsForProgramme(programme);
  const defaultGroup = defaultGroupForProgramme(programme);

  Array.from(groupSelect.options).forEach(option => {
    const shouldShow = !allowed || allowed.includes(option.value);
    option.hidden = !shouldShow;
    option.disabled = !shouldShow;
  });

  if (allowed && !allowed.includes(groupSelect.value)) setNativeSelectValue(groupSelect, defaultGroup || allowed[0]);
}

function addOneToOneHelper() {
  const setupCard = Array.from(document.querySelectorAll('.card')).find(card => card.querySelector('h2')?.textContent?.trim() === 'Lesson setup');
  if (!setupCard || setupCard.querySelector('[data-stageflow-evening-mode]')) return;

  const helper = document.createElement('div');
  helper.className = 'folder';
  helper.dataset.stageflowEveningMode = 'true';
  helper.innerHTML = `
    <strong>Programme controls criteria groups</strong>
    <p class="muted"><b>School Swimming</b> shows school groups. <b>Evening Swim Group</b> shows evening group criteria. <b>Evening Swim 1:1</b> locks onto all stages so you can assess whatever that swimmer needs.</p>
  `;
  setupCard.appendChild(helper);
}

function findTimetableHero() {
  return Array.from(document.querySelectorAll('.hero')).find(hero => {
    const text = hero.textContent || '';
    return text.includes('Lesson plan') || text.includes('Choose the group first');
  });
}

function findAddSessionButton() {
  return Array.from(document.querySelectorAll('button')).find(button => {
    const label = (button.textContent || '').trim();
    return label === '+ Add class/session' || label === '+ Add group lesson' || label.includes('Add class/session');
  });
}

function createQuickSession(preset) {
  const addButton = findAddSessionButton();
  if (!addButton) return;

  addButton.click();
  window.setTimeout(() => {
    setSelectField('Programme', preset.programme);
    window.setTimeout(() => {
      runPatches();
      setSelectField('Assessment group', preset.groupTemplateId, preset.groupTemplateId === ONE_TO_ONE_GROUP_ID ? 'Evening Swim 1:1 — All stages visible' : preset.groupTemplateId);
      setInputField('Lesson name', preset.name);
      setInputField('School / venue', preset.school);
      setInputField('Year / class', preset.year);
      setInputField('Coach', 'Lewis');
      setInputField('Start time', preset.time);
      setSelectField('Duration', preset.duration, `${preset.duration} minutes`);
    }, 80);
  }, 80);
}

function addQuickSessionShortcuts() {
  const hero = findTimetableHero();
  if (!hero || document.querySelector('[data-stageflow-quick-sessions]')) return;

  const section = document.createElement('section');
  section.className = 'card';
  section.dataset.stageflowQuickSessions = 'true';
  section.innerHTML = `
    <h2>Quick add</h2>
    <p class="muted">Start with the common session types, then tweak the day, time, venue and names.</p>
    <div class="quick-actions">
      ${QUICK_SESSIONS.map(preset => `
        <button class="action-card" data-stageflow-quick-session="${preset.id}">
          <span>${preset.title}</span>
          <small>${preset.detail}</small>
        </button>
      `).join('')}
    </div>
  `;
  hero.insertAdjacentElement('afterend', section);

  section.addEventListener('click', event => {
    const button = event.target.closest('[data-stageflow-quick-session]');
    if (!button) return;
    const preset = QUICK_SESSIONS.find(item => item.id === button.dataset.stageflowQuickSession);
    if (preset) createQuickSession(preset);
  });
}

function patchScoreLabels() {
  const replacements = new Map([
    ['Not seen', 'Not assessed'],
    ['Needs work', 'Almost there'],
    ['Cannot do it', 'Not assessed'],
    ['Can do it with float', 'Almost there']
  ]);
  document.querySelectorAll('button, span, small, p, b, option').forEach(element => {
    if (element.childNodes.length !== 1 || element.firstChild?.nodeType !== Node.TEXT_NODE) return;
    const text = element.textContent.trim();
    if (replacements.has(text)) element.textContent = replacements.get(text);
  });
}

function patchStepLabels() {
  const stepLabels = new Map([
    ['edit', '1 Setup'],
    ['Setup', '1 Setup'],
    ['register', '2 Names'],
    ['Assess group', '3 Assess'],
    ['assess', '3 Assess'],
    ['save', '4 Summary']
  ]);
  document.querySelectorAll('.steps span').forEach(step => {
    const text = step.textContent.trim();
    if (stepLabels.has(text)) step.textContent = stepLabels.get(text);
  });
}

function addSimpleFlowHelper() {
  const lessonHero = Array.from(document.querySelectorAll('.hero')).find(hero => hero.querySelector('.steps'));
  if (!lessonHero || document.querySelector('[data-stageflow-simple-flow]')) return;
  const helper = document.createElement('section');
  helper.className = 'card simple-flow-card';
  helper.dataset.stageflowSimpleFlow = 'true';
  helper.innerHTML = `
    <h2>Simple lesson flow</h2>
    <div class="simple-flow-grid">
      <div><strong>1 Setup</strong><small>Programme, day, time, criteria</small></div>
      <div><strong>2 Names</strong><small>Add swimmers and attendance</small></div>
      <div><strong>3 Assess</strong><small>By swimmer or by skill</small></div>
      <div><strong>4 Summary</strong><small>Check progress and finish</small></div>
    </div>
  `;
  lessonHero.insertAdjacentElement('afterend', helper);
}

function injectCompactDesktopStyles() {
  if (document.getElementById('stageflow-compact-desktop-style')) return;
  const style = document.createElement('style');
  style.id = 'stageflow-compact-desktop-style';
  style.textContent = `
    @media (min-width: 1000px) {
      h1 { font-size: clamp(28px, 3vw, 42px) !important; }
      h2 { font-size: 19px !important; }
      .wrap { max-width: 1120px !important; padding: 14px !important; grid-template-columns: 64px minmax(0, 1fr) !important; gap: 14px !important; }
      .top { padding: 8px 16px !important; }
      .brand { font-size: 22px !important; }
      .brand:before { width: 36px !important; height: 36px !important; }
      .hero { padding: 22px !important; border-radius: 20px !important; margin-bottom: 12px !important; }
      .card { padding: 13px !important; margin-bottom: 10px !important; border-radius: 16px !important; }
      .quick-actions { gap: 10px !important; }
      .action-card { min-height: 82px !important; padding: 12px !important; border-radius: 16px !important; }
      .action-card span { font-size: 16px !important; }
      .lesson { grid-template-columns: 78px minmax(0, 1fr) auto !important; padding: 12px !important; }
      .time { font-size: 21px !important; }
      .score-btn { padding: 7px 10px !important; min-height: 34px !important; }
      .field { margin-top: 7px !important; }
      input, select, textarea { padding: 8px 10px !important; }
      textarea { min-height: 78px !important; }
      .learner-button, .criteria, .skill-row, .folder { padding: 9px !important; border-radius: 13px !important; }
      .simple-flow-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
    }
    .simple-flow-card { border-top: 5px solid #0ea5e9; }
    .simple-flow-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: 8px; }
    .simple-flow-grid div { border: 1px solid #dbe7f3; background: #f8fbff; border-radius: 14px; padding: 10px; }
    .simple-flow-grid strong { display: block; font-weight: 1000; }
    .simple-flow-grid small { display: block; color: #60738a; font-weight: 850; margin-top: 3px; }
    .autopass-note { border-left-color: #16a34a !important; background: #f0fdf4 !important; }
  `;
  document.head.appendChild(style);
}

function showAutoPassNotice() {
  const assessCard = Array.from(document.querySelectorAll('.assessment-card, .skill-assessment')).find(Boolean);
  if (!assessCard) return;
  let notice = assessCard.querySelector('[data-stageflow-autopass-note]');
  if (!notice) {
    notice = document.createElement('div');
    notice.className = 'folder autopass-note';
    notice.dataset.stageflowAutopassNote = 'true';
    assessCard.prepend(notice);
  }
  notice.innerHTML = '<strong>Auto-pass saved</strong><p class="muted">Higher distance passes now save the matching lower front/back/breaststroke/butterfly criteria and National Curriculum distance tick where relevant.</p>';
}

function readSavedState() {
  try {
    const text = window.localStorage.getItem(STATE_KEY);
    return text ? JSON.parse(text) : null;
  } catch { return null; }
}

function refreshVisibleAssessmentButtons() {
  const state = readSavedState();
  if (!state) return;
  const activeLessonId = state.active;
  const selectedId = state.selected;
  const selectedLearner = state.learners?.find(learner => learner.id === selectedId) || state.learners?.find(learner => learner.lesson === activeLessonId && learner.att !== 'Absent');

  document.querySelectorAll('.skill-card').forEach(card => {
    const criteria = card.querySelector('b')?.textContent?.trim();
    if (!criteria || !selectedLearner?.res?.[criteria]) return;
    card.querySelectorAll('.score-btn').forEach(button => {
      const label = button.textContent.trim();
      button.classList.toggle('on', selectedLearner.res[criteria] === 'pass' && label === 'Passed');
    });
  });

  const skillSelect = getFieldByLabel('Group skill')?.querySelector('select');
  const currentSkill = skillSelect?.value;
  if (currentSkill) {
    document.querySelectorAll('.skill-row').forEach(row => {
      const name = row.querySelector('h3')?.textContent?.trim();
      const learner = state.learners?.find(item => item.lesson === activeLessonId && item.name === name);
      if (!learner?.res?.[currentSkill]) return;
      row.querySelectorAll('.score-btn').forEach(button => {
        const label = button.textContent.trim();
        button.classList.toggle('on', learner.res[currentSkill] === 'pass' && label === 'Passed');
      });
    });
  }
}

function setupAssessmentClickWatcher() {
  if (window.__stageFlowAssessmentWatcherInstalled) return;
  window.__stageFlowAssessmentWatcherInstalled = true;
  document.addEventListener('click', event => {
    const button = event.target.closest('.score-btn');
    if (!button || button.textContent.trim() !== 'Passed') return;
    window.setTimeout(() => {
      patchSavedState();
      refreshVisibleAssessmentButtons();
      showAutoPassNotice();
    }, 120);
  }, true);
}

function runPatches() {
  patchProgrammeSelects();
  patchGroupSelectForProgramme();
  addOneToOneHelper();
  addQuickSessionShortcuts();
  patchScoreLabels();
  patchStepLabels();
  addSimpleFlowHelper();
  injectCompactDesktopStyles();
}

installStateInterceptor();
patchSavedState();
setupAssessmentClickWatcher();
new MutationObserver(runPatches).observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('load', runPatches);
setTimeout(runPatches, 250);

document.addEventListener('change', event => {
  const select = event.target.closest('select');
  if (!select) return;
  const field = select.closest('.field');
  const label = field?.querySelector('label')?.textContent?.trim();
  if (label === 'Programme' || label === 'Assessment group') setTimeout(runPatches, 0);
}, true);
