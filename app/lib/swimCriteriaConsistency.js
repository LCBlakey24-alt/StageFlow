const STATE_KEY = 'stageflow-state';

const SWIM_CRITERIA_ADDITIONS = {
  'Stage 1': [
    { after: 'Blow bubbles with mouth and nose in the water', text: 'Exhale gently into the water with face in' }
  ],
  'Stage 2': [
    { after: 'Push and glide on back with arms extended', text: 'Blow bubbles while travelling on the front' }
  ],
  'Stage 3': [
    { after: 'Swim 10m front crawl with face in and breathing attempt', text: 'Turn head to the side for a front crawl breathing attempt' }
  ],
  'Stage 4': [
    { after: 'Swim 15m front crawl with recognisable technique', text: 'Swim 15m front crawl with side breathing attempt' }
  ],
  'Stage 5': [
    { after: 'Swim 25m front crawl with consistent breathing attempt', text: 'Breathe to the side without lifting head on front crawl' }
  ],
  'Stage 6': [
    { after: 'Swim 50m front crawl with controlled breathing', text: 'Maintain controlled side breathing over 50m front crawl' }
  ],
  'Stage 7': [
    { after: 'Swim 50m front crawl with consistent technique', text: 'Use bilateral or chosen-side breathing over 50m front crawl' }
  ]
};

function insertAfter(list = [], afterText, newText) {
  if (list.includes(newText)) return list;
  const next = [...list];
  const index = next.indexOf(afterText);
  if (index >= 0) next.splice(index + 1, 0, newText);
  else next.push(newText);
  return next;
}

function patchCriteria(criteria = {}) {
  const next = { ...criteria };
  Object.entries(SWIM_CRITERIA_ADDITIONS).forEach(([stage, additions]) => {
    let stageCriteria = Array.isArray(next[stage]) ? [...next[stage]] : [];
    additions.forEach(addition => {
      stageCriteria = insertAfter(stageCriteria, addition.after, addition.text);
    });
    next[stage] = stageCriteria;
  });
  return next;
}

function patchState(state) {
  if (!state || typeof state !== 'object') return state;
  return {
    ...state,
    framework: {
      ...(state.framework || {}),
      criteria: patchCriteria(state.framework?.criteria || {})
    }
  };
}

function patchStateJson(value) {
  try {
    return JSON.stringify(patchState(JSON.parse(value)));
  } catch {
    return value;
  }
}

function patchSavedState() {
  try {
    const current = window.localStorage.getItem(STATE_KEY);
    if (!current) return;
    const patched = patchStateJson(current);
    if (patched !== current) window.localStorage.setItem(STATE_KEY, patched);
  } catch {
    // Keep the app usable even when storage is unavailable or malformed.
  }
}

function installStorageGuard() {
  if (window.__stageFlowSwimCriteriaConsistencyInstalled) return;
  window.__stageFlowSwimCriteriaConsistencyInstalled = true;
  const previousSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function stageFlowSwimCriteriaSetItem(key, value) {
    const nextValue = key === STATE_KEY && typeof value === 'string' ? patchStateJson(value) : value;
    return previousSetItem.call(this, key, nextValue);
  };
}

function addReadinessHint() {
  const settingsHero = Array.from(document.querySelectorAll('.hero h1')).find(title => title.textContent.trim() === 'Stability health check');
  const main = settingsHero?.closest('main') || document.querySelector('main');
  if (!settingsHero || !main || main.querySelector('[data-swim-criteria-consistency]')) return;
  const note = document.createElement('section');
  note.className = 'card';
  note.dataset.swimCriteriaConsistency = 'true';
  note.innerHTML = `
    <h2>Swim criteria consistency</h2>
    <p class="muted">Breathing criteria are protected in saved data, including Evening Swim 1:1 and Evening Swim Group sessions.</p>
  `;
  settingsHero.closest('.hero')?.insertAdjacentElement('afterend', note);
}

installStorageGuard();
patchSavedState();
window.addEventListener('load', () => {
  patchSavedState();
  addReadinessHint();
});
new MutationObserver(addReadinessHint).observe(document.documentElement, { childList: true, subtree: true });
setTimeout(patchSavedState, 300);
setTimeout(addReadinessHint, 500);
