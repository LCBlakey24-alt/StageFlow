import { demoFramework, groupTemplates, programmeAreas, stageCriteria } from '../data/demoData.js';

const STATE_KEY = 'stageflow-state';
const ONE_TO_ONE = 'Evening Swim 1:1';
const EVENING_GROUP = 'Evening Swim Group';
const SCHOOL_SWIM = 'School Swimming';
const PRIVATE_LESSONS = 'Private Lessons';
const SCHOOL_PE = 'School PE';
const GYMNASTICS = 'Gymnastics';
const ONE_TO_ONE_GROUP_ID = 'eg121';
const LEGACY_PROGRAMMES = new Map([
  ['Evening Swim Lessons', EVENING_GROUP],
  ['Group Lessons', EVENING_GROUP],
  ['1:1 Lessons', ONE_TO_ONE],
  ['One-to-one Lessons', ONE_TO_ONE],
  ['Evening 1:1', ONE_TO_ONE],
  ['Evening Swim 121', ONE_TO_ONE],
  ['Evening Swim One-to-one', ONE_TO_ONE]
]);
const SWIM_PROGRAMMES = new Set([SCHOOL_SWIM, EVENING_GROUP, ONE_TO_ONE, PRIVATE_LESSONS]);
const SWIM_STAGES = ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5', 'Stage 6', 'Stage 7', 'Self Rescue Award'];
const REQUIRED_STAGE_MARKERS = ['Gymnastics Advanced', 'PE Fundamentals', 'Maintain controlled side breathing over 50m front crawl'];

let patching = false;

function unique(list = []) {
  return [...new Set(list.filter(Boolean))];
}

function normaliseProgramme(programme) {
  const value = String(programme || '').trim();
  if (!value) return SCHOOL_SWIM;
  return LEGACY_PROGRAMMES.get(value) || value;
}

function programmeForGroup(group = {}) {
  if (group.programme) return normaliseProgramme(group.programme);
  const text = `${group.name || ''} ${group.detail || ''} ${(group.stages || []).join(' ')}`.toLowerCase();
  if (text.includes('gymnastics')) return GYMNASTICS;
  if (text.includes('pe ')) return SCHOOL_PE;
  if (text.includes('1:1') || group.allStages) return ONE_TO_ONE;
  if (text.includes('evening')) return EVENING_GROUP;
  return SCHOOL_SWIM;
}

function allowedStagesForProgramme(programme) {
  const normal = normaliseProgramme(programme);
  if (SWIM_PROGRAMMES.has(normal)) return SWIM_STAGES;
  if (normal === GYMNASTICS) return ['Gymnastics Beginner', 'Gymnastics Improver', 'Gymnastics Advanced'];
  if (normal === SCHOOL_PE) return ['PE Fundamentals', 'PE Games Skills', 'PE Teamwork & Leadership'];
  return demoFramework.stages || [];
}

function defaultGroupForProgramme(programme, templates) {
  const normal = normaliseProgramme(programme);
  if (normal === ONE_TO_ONE || normal === PRIVATE_LESSONS) return templates.find(group => group.id === ONE_TO_ONE_GROUP_ID)?.id || ONE_TO_ONE_GROUP_ID;
  return templates.find(group => programmeForGroup(group) === normal)?.id || templates[0]?.id || '';
}

function mergeCriteria(current = {}) {
  const next = { ...(current || {}) };
  Object.entries(stageCriteria || {}).forEach(([stage, criteria]) => {
    next[stage] = unique([...(Array.isArray(next[stage]) ? next[stage] : []), ...(criteria || [])]);
  });
  return next;
}

function mergeGroupTemplates(current = []) {
  const byId = new Map();
  (groupTemplates || []).forEach(group => byId.set(group.id, { ...group }));
  (Array.isArray(current) ? current : []).forEach(group => {
    if (!group?.id) return;
    const fallback = byId.get(group.id) || {};
    byId.set(group.id, {
      ...fallback,
      ...group,
      programme: normaliseProgramme(group.programme || fallback.programme || programmeForGroup(group)),
      stages: group.id === ONE_TO_ONE_GROUP_ID ? SWIM_STAGES : unique(group.stages?.length ? group.stages : fallback.stages || [])
    });
  });
  return Array.from(byId.values());
}

function patchLesson(lesson = {}, templates) {
  const programme = normaliseProgramme(lesson.programme);
  const matchingGroup = templates.find(group => group.id === lesson.groupTemplateId);
  const groupMatchesProgramme = matchingGroup && (programmeForGroup(matchingGroup) === programme || programme === 'Custom');
  const groupTemplateId = groupMatchesProgramme ? lesson.groupTemplateId : defaultGroupForProgramme(programme, templates);
  return {
    ...lesson,
    programme,
    groupTemplateId,
    school: lesson.school || (programme === PRIVATE_LESSONS ? 'Private Client' : programme),
    className: programme === ONE_TO_ONE ? (lesson.className || 'All stages') : (lesson.className || '')
  };
}

function patchState(state) {
  if (!state || typeof state !== 'object') return state;
  const original = JSON.stringify(state);
  const templates = mergeGroupTemplates(state.framework?.groupTemplates || []);
  const criteria = mergeCriteria(state.framework?.criteria || {});
  const stages = unique([...(demoFramework.stages || []), ...(state.framework?.stages || []), ...Object.keys(criteria)]);
  const programmes = unique([...(programmeAreas || []), ...(state.programmes || [])]);
  const lessons = Array.isArray(state.lessons) ? state.lessons.map(lesson => patchLesson(lesson, templates)) : [];
  const next = {
    ...state,
    programmes,
    framework: {
      ...(state.framework || {}),
      name: state.framework?.name || demoFramework.name,
      scoringSystem: state.framework?.scoringSystem || demoFramework.scoringSystem,
      stages,
      criteria,
      groupTemplates: templates,
      groups: templates.map(group => `${group.name}: ${group.detail || ''}`)
    },
    lessons
  };
  return JSON.stringify(next) === original ? state : next;
}

function readState() {
  try {
    const text = window.localStorage.getItem(STATE_KEY);
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function writeStateDirect(state) {
  const text = JSON.stringify(state);
  if (window.localStorage.getItem(STATE_KEY) === text) return;
  patching = true;
  try {
    // Bracket assignment uses the Storage named-property setter in browsers and avoids re-running older helper wrappers.
    window.localStorage[STATE_KEY] = text;
  } catch {
    try { window.localStorage.setItem(STATE_KEY, text); } catch {}
  } finally {
    patching = false;
  }
}

function patchSavedState() {
  const state = readState();
  if (!state) return;
  const patched = patchState(state);
  if (patched !== state) writeStateDirect(patched);
}

function installStorageGuard() {
  if (window.__stageFlowActivityFrameworkSafetyInstalled) return;
  window.__stageFlowActivityFrameworkSafetyInstalled = true;
  const previousSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function stageFlowActivityFrameworkSetItem(key, value) {
    const result = previousSetItem.call(this, key, value);
    if (key === STATE_KEY && !patching) {
      window.setTimeout(patchSavedState, 0);
      window.setTimeout(patchSavedState, 80);
    }
    return result;
  };
}

function frameworkLooksHealthy(state) {
  const stages = state?.framework?.stages || [];
  const criteriaValues = Object.values(state?.framework?.criteria || {}).flat();
  return REQUIRED_STAGE_MARKERS.every(marker => stages.includes(marker) || criteriaValues.includes(marker));
}

function addHealthNote() {
  const healthHero = Array.from(document.querySelectorAll('.hero h1')).find(title => title.textContent.trim() === 'Stability health check');
  const hero = healthHero?.closest('.hero');
  if (!hero || document.querySelector('[data-activity-framework-safety]')) return;
  const state = readState();
  const note = document.createElement('section');
  note.className = 'card';
  note.dataset.activityFrameworkSafety = 'true';
  note.innerHTML = `
    <h2>Activity framework safety</h2>
    <p class="muted">${frameworkLooksHealthy(state) ? 'Swimming breathing, PE and gymnastics criteria are protected in saved data.' : 'Framework safety patch is active. Use the Data Health Check safe fixes if old saved data still needs repair.'}</p>
  `;
  hero.insertAdjacentElement('afterend', note);
}

installStorageGuard();
patchSavedState();
window.addEventListener('load', () => {
  patchSavedState();
  addHealthNote();
});
new MutationObserver(() => {
  patchSavedState();
  addHealthNote();
}).observe(document.documentElement, { childList: true, subtree: true });
window.setTimeout(patchSavedState, 100);
window.setTimeout(patchSavedState, 500);
window.setTimeout(addHealthNote, 600);
