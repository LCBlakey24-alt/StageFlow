const ONE_TO_ONE = 'Evening Swim 1:1';
const EVENING_GROUP = 'Evening Swim Group';
const SCHOOL_SWIM = 'School Swimming';
const PRIVATE_LESSONS = 'Private Lessons';
const ONE_TO_ONE_GROUP_ID = 'eg121';
const STATE_KEY = 'stageflow-state';

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
  {
    id: 'school',
    title: 'School swim class',
    detail: 'School, day, group criteria',
    programme: SCHOOL_SWIM,
    groupTemplateId: 'g1',
    name: 'New School Swim Class',
    school: 'New School',
    year: 'Year group',
    className: 'Group 1',
    time: '09:00',
    duration: '30'
  },
  {
    id: 'evening-group',
    title: 'Evening swim group',
    detail: 'Shared evening criteria group',
    programme: EVENING_GROUP,
    groupTemplateId: 'eg1',
    name: 'Evening Swim Group',
    school: EVENING_GROUP,
    year: 'Evening swimmers',
    className: 'Stage 1-3',
    time: '17:00',
    duration: '30'
  },
  {
    id: 'evening-121',
    title: 'Evening swim 1:1',
    detail: 'All stages visible',
    programme: ONE_TO_ONE,
    groupTemplateId: ONE_TO_ONE_GROUP_ID,
    name: 'Evening Swim 1:1',
    school: ONE_TO_ONE,
    year: '1:1 swimmer',
    className: 'All stages',
    time: '17:30',
    duration: '30'
  }
];

function getFieldByLabel(labelText) {
  return Array.from(document.querySelectorAll('.field')).find(field => {
    const label = field.querySelector('label')?.textContent?.trim();
    return label === labelText;
  });
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

function allowedGroupsForProgramme(programme) {
  return PROGRAMME_GROUPS[normaliseLegacyEveningProgramme(programme)] || null;
}

function defaultGroupForProgramme(programme) {
  return PROGRAMME_DEFAULT_GROUP[normaliseLegacyEveningProgramme(programme)] || '';
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

  if (allowed && !allowed.includes(groupSelect.value)) {
    setNativeSelectValue(groupSelect, defaultGroup || allowed[0]);
  }
}

function addOneToOneHelper() {
  const setupCard = Array.from(document.querySelectorAll('.card')).find(card => {
    return card.querySelector('h2')?.textContent?.trim() === 'Lesson setup';
  });
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

function patchSavedState() {
  try {
    const text = window.localStorage.getItem(STATE_KEY);
    if (!text) return;
    const state = JSON.parse(text);
    if (!state || typeof state !== 'object') return;
    let changed = false;

    if (Array.isArray(state.lessons)) {
      state.lessons = state.lessons.map(lesson => {
        const programme = normaliseLegacyEveningProgramme(lesson.programme);
        const allowed = allowedGroupsForProgramme(programme);
        const defaultGroup = defaultGroupForProgramme(programme);
        let next = programme !== lesson.programme ? { ...lesson, programme } : lesson;

        if (allowed && !allowed.includes(next.groupTemplateId)) {
          next = { ...next, groupTemplateId: defaultGroup || allowed[0] };
        }

        if (next.programme === ONE_TO_ONE || next.programme === PRIVATE_LESSONS) {
          next = { ...next, groupTemplateId: ONE_TO_ONE_GROUP_ID, school: next.programme, className: next.className || 'All stages' };
        }

        if (next !== lesson) changed = true;
        return next;
      });
    }

    if (changed) window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // Leave user data alone if localStorage is unavailable or malformed.
  }
}

function runPatches() {
  patchProgrammeSelects();
  patchGroupSelectForProgramme();
  addOneToOneHelper();
  addQuickSessionShortcuts();
}

patchSavedState();
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
