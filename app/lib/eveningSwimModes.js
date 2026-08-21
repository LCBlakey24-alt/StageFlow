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
