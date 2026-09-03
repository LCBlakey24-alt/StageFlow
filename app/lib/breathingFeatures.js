const STATE_KEY = 'stageflow-state';
const BREATHING_KEY = 'stageflow-breathing-progress';
const nativeSetItem = Storage.prototype.setItem;

const BREATHING_CRITERIA = {
  bubbles: [
    'Blow bubbles with mouth and nose in the water'
  ],
  exhale: [
    'Blow bubbles with mouth and nose in the water',
    'Exhale gently into the water with face in',
    'Blow bubbles while travelling on the front'
  ],
  side: [
    'Blow bubbles with mouth and nose in the water',
    'Exhale gently into the water with face in',
    'Blow bubbles while travelling on the front',
    'Swim 10m front crawl with face in and breathing attempt',
    'Turn head to the side for a front crawl breathing attempt',
    'Swim 15m front crawl with side breathing attempt'
  ],
  controlled: [
    'Blow bubbles with mouth and nose in the water',
    'Exhale gently into the water with face in',
    'Blow bubbles while travelling on the front',
    'Swim 10m front crawl with face in and breathing attempt',
    'Turn head to the side for a front crawl breathing attempt',
    'Swim 15m front crawl with side breathing attempt',
    'Swim 25m front crawl with consistent breathing attempt',
    'Breathe to the side without lifting head on front crawl',
    'Swim 50m front crawl with controlled breathing',
    'Maintain controlled side breathing over 50m front crawl'
  ],
  bilateral: [
    'Blow bubbles with mouth and nose in the water',
    'Exhale gently into the water with face in',
    'Blow bubbles while travelling on the front',
    'Swim 10m front crawl with face in and breathing attempt',
    'Turn head to the side for a front crawl breathing attempt',
    'Swim 15m front crawl with side breathing attempt',
    'Swim 25m front crawl with consistent breathing attempt',
    'Breathe to the side without lifting head on front crawl',
    'Swim 50m front crawl with controlled breathing',
    'Maintain controlled side breathing over 50m front crawl',
    'Use bilateral or chosen-side breathing over 50m front crawl'
  ]
};

const BREATHING_LEVELS = [
  { value: 'no', label: 'Not assessed', hint: 'Leave breathing open.' },
  { value: 'bubbles', label: 'Bubbles', hint: 'Bubbles with face in.' },
  { value: 'exhale', label: 'Exhale', hint: 'Breath out while moving.' },
  { value: 'side', label: 'Side breath', hint: 'Turns head for front crawl.' },
  { value: 'controlled', label: 'Controlled', hint: 'Consistent front-crawl breathing.' },
  { value: 'bilateral', label: 'Bilateral', hint: 'Either-side or chosen-side control.' }
];

const BREATHING_SIDES = [
  { value: '', label: 'No side' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'both', label: 'Both' },
  { value: 'bilateral', label: 'Bilateral' }
];

const STAGE_ADDITIONS = {
  'Stage 1': ['Exhale gently into the water with face in'],
  'Stage 2': ['Blow bubbles while travelling on the front'],
  'Stage 3': ['Turn head to the side for a front crawl breathing attempt'],
  'Stage 4': ['Swim 15m front crawl with side breathing attempt'],
  'Stage 5': ['Breathe to the side without lifting head on front crawl'],
  'Stage 6': ['Maintain controlled side breathing over 50m front crawl'],
  'Stage 7': ['Use bilateral or chosen-side breathing over 50m front crawl']
};

function readJson(key, fallback) {
  try {
    const text = window.localStorage.getItem(key);
    return text ? JSON.parse(text) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    nativeSetItem.call(window.localStorage, key, JSON.stringify(value));
  } catch {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
}

function text(value) {
  return String(value || '').trim();
}

function currentState() {
  return readJson(STATE_KEY, null);
}

function breathingCache() {
  const cache = readJson(BREATHING_KEY, {});
  return cache && typeof cache === 'object' ? cache : {};
}

function saveBreathingCache(cache) {
  writeJson(BREATHING_KEY, cache);
}

function allBreathingCriteriaFor(level) {
  if (!level || level === 'no') return [];
  return BREATHING_CRITERIA[level] || [];
}

function mergeBreathingCriteria(criteria = {}) {
  const next = { ...criteria };
  Object.entries(STAGE_ADDITIONS).forEach(([stage, additions]) => {
    const current = Array.isArray(next[stage]) ? [...next[stage]] : [];
    additions.forEach(item => {
      if (!current.includes(item)) current.push(item);
    });
    next[stage] = current;
  });
  return next;
}

function applyBreathingToLearner(learner, saved) {
  if (!saved) return learner;
  const res = { ...(learner.res || {}) };
  allBreathingCriteriaFor(saved.level).forEach(criteria => {
    res[criteria] = 'pass';
  });
  return {
    ...learner,
    res,
    breathing: {
      ...(learner.breathing || {}),
      level: saved.level || learner.breathing?.level || '',
      side: saved.side ?? learner.breathing?.side ?? '',
      note: saved.note ?? learner.breathing?.note ?? '',
      updatedAt: saved.updatedAt || learner.breathing?.updatedAt || new Date().toISOString()
    }
  };
}

function patchStateWithBreathing() {
  const state = currentState();
  if (!state || typeof state !== 'object') return state;
  const cache = breathingCache();
  const framework = {
    ...(state.framework || {}),
    name: 'JB Swimming Assessment Framework',
    scoringSystem: 'jbSwimming',
    criteria: mergeBreathingCriteria(state.framework?.criteria || {})
  };
  const learners = Array.isArray(state.learners)
    ? state.learners.map(learner => applyBreathingToLearner(learner, cache[learner.id]))
    : [];
  const next = { ...state, framework, learners };
  writeJson(STATE_KEY, next);
  return next;
}

function selectedLearner(state = currentState()) {
  if (!state) return null;
  const active = state.active;
  return state.learners?.find(learner => learner.id === state.selected)
    || state.learners?.find(learner => learner.lesson === active && learner.att !== 'Absent')
    || null;
}

function setBreathingValue(learnerId, update) {
  if (!learnerId) return;
  const cache = breathingCache();
  cache[learnerId] = {
    ...(cache[learnerId] || {}),
    ...update,
    updatedAt: new Date().toISOString()
  };
  saveBreathingCache(cache);
  patchStateWithBreathing();
  renderBreathingPanel();
  refreshVisibleButtons();
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function findAssessmentCard() {
  return document.querySelector('.assessment-card');
}

function breathingSummary(saved) {
  const level = BREATHING_LEVELS.find(item => item.value === saved?.level)?.label || 'Not assessed';
  const side = BREATHING_SIDES.find(item => item.value === saved?.side)?.label || 'No side';
  return `${level} · ${side}`;
}

function renderBreathingPanel() {
  const card = findAssessmentCard();
  if (!card) return;
  const state = patchStateWithBreathing() || currentState();
  const learner = selectedLearner(state);
  if (!learner) return;

  let panel = card.querySelector('[data-stageflow-breathing-panel]');
  if (!panel) {
    panel = document.createElement('section');
    panel.className = 'breathing-panel folder';
    panel.dataset.stageflowBreathingPanel = 'true';
    const head = card.querySelector('.assessment-head');
    if (head) head.insertAdjacentElement('afterend', panel);
    else card.prepend(panel);
  }

  const saved = breathingCache()[learner.id] || learner.breathing || {};
  panel.innerHTML = `
    <div class="breathing-head">
      <div>
        <strong>Breathing</strong>
        <small>${escapeHtml(learner.name)} · ${escapeHtml(breathingSummary(saved))}</small>
      </div>
      <span class="breathing-status">Front crawl helper</span>
    </div>
    <div class="breathing-buttons">
      ${BREATHING_LEVELS.map(level => `
        <button class="breathing-btn ${saved.level === level.value ? 'on' : ''}" data-breathing-level="${level.value}">
          <span>${level.label}</span>
          <small>${level.hint}</small>
        </button>
      `).join('')}
    </div>
    <div class="breathing-side-row">
      ${BREATHING_SIDES.map(side => `
        <button class="breathing-side ${String(saved.side || '') === side.value ? 'on' : ''}" data-breathing-side="${side.value}">${side.label}</button>
      `).join('')}
    </div>
    <p class="muted">Marking a higher breathing level saves the relevant lower breathing criteria automatically.</p>
  `;
}

function ensureStyles() {
  if (document.getElementById('stageflow-breathing-style')) return;
  const style = document.createElement('style');
  style.id = 'stageflow-breathing-style';
  style.textContent = `
    .breathing-panel{border-left-color:#0ea5e9!important;background:linear-gradient(180deg,#f8fbff,#ffffff)!important;margin:10px 0!important}
    .breathing-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:9px}
    .breathing-head strong{display:block;font-size:18px}
    .breathing-head small{display:block;color:#60738a;font-weight:850;margin-top:2px}
    .breathing-status{border-radius:999px;background:#071527;color:#fff;padding:5px 9px;font-size:12px;font-weight:1000;white-space:nowrap}
    .breathing-buttons{display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:8px;margin:8px 0}
    .breathing-btn{border:1px solid #dbe7f3;background:#fff;color:#071527;border-radius:14px;padding:9px;text-align:left;font-weight:1000;min-height:62px}
    .breathing-btn span{display:block;font-size:14px}
    .breathing-btn small{display:block;color:#60738a;font-size:11px;font-weight:850;margin-top:3px;line-height:1.15}
    .breathing-btn.on{background:linear-gradient(135deg,#071527,#12365f);color:#fff;border-color:transparent;box-shadow:inset 0 -4px 0 #f97316}
    .breathing-btn.on small{color:#dff4ff}
    .breathing-side-row{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}
    .breathing-side{border:1px solid #dbe7f3;background:#fff;color:#071527;border-radius:999px;padding:7px 10px;font-weight:1000}
    .breathing-side.on{background:#f97316;color:#fff;border-color:#f97316}
    @media(max-width:850px){.breathing-buttons{grid-template-columns:repeat(2,minmax(0,1fr))}.breathing-head{display:block}.breathing-status{display:inline-flex;margin-top:7px}.breathing-btn{min-height:58px}}
  `;
  document.head.appendChild(style);
}

function refreshVisibleButtons() {
  const state = currentState();
  const learner = selectedLearner(state);
  if (!state || !learner) return;
  document.querySelectorAll('.skill-card').forEach(card => {
    const criteria = text(card.querySelector('b')?.textContent);
    const value = learner.res?.[criteria];
    card.querySelectorAll('.score-btn').forEach(button => {
      const label = text(button.textContent);
      button.classList.toggle('on', value === 'pass' && label === 'Passed');
    });
  });
}

function inferBreathingLevel(criteria) {
  const lower = String(criteria || '').toLowerCase();
  if (lower.includes('bilateral') || lower.includes('chosen-side')) return 'bilateral';
  if (lower.includes('controlled breathing') || lower.includes('controlled side breathing') || lower.includes('50m front crawl')) return 'controlled';
  if (lower.includes('side breathing') || lower.includes('breathing attempt') || lower.includes('breathe to the side')) return 'side';
  if (lower.includes('exhale') || lower.includes('while travelling')) return 'exhale';
  if (lower.includes('bubble')) return 'bubbles';
  return '';
}

function learnerForSkillRow(row) {
  const state = currentState();
  if (!state) return null;
  const name = text(row.querySelector('h3')?.textContent);
  return state.learners?.find(learner => learner.lesson === state.active && learner.name === name) || null;
}

function installListeners() {
  if (window.__stageFlowBreathingInstalled) return;
  window.__stageFlowBreathingInstalled = true;

  document.addEventListener('click', event => {
    const levelButton = event.target.closest('[data-breathing-level]');
    if (levelButton) {
      const learner = selectedLearner();
      setBreathingValue(learner?.id, { level: levelButton.dataset.breathingLevel });
      return;
    }

    const sideButton = event.target.closest('[data-breathing-side]');
    if (sideButton) {
      const learner = selectedLearner();
      setBreathingValue(learner?.id, { side: sideButton.dataset.breathingSide });
      return;
    }

    const scoreButton = event.target.closest('.score-btn');
    if (!scoreButton || text(scoreButton.textContent) !== 'Passed') return;

    window.setTimeout(() => {
      patchStateWithBreathing();
      const skillCard = scoreButton.closest('.skill-card');
      const skillRow = scoreButton.closest('.skill-row');
      const criteria = text(skillCard?.querySelector('b')?.textContent) || text(document.querySelector('[label="Group skill"] select')?.value) || text(document.querySelector('.field label')?.textContent);
      const selectedSkill = text(document.querySelector('.field label')?.textContent === 'Group skill' ? document.querySelector('.field select')?.value : '') || text(document.querySelector('select')?.value);
      const actualCriteria = criteria || selectedSkill;
      const inferred = inferBreathingLevel(actualCriteria);
      if (inferred) {
        const learner = skillRow ? learnerForSkillRow(skillRow) : selectedLearner();
        setBreathingValue(learner?.id, { level: inferred });
      } else {
        renderBreathingPanel();
        refreshVisibleButtons();
      }
    }, 150);
  }, true);
}

function tick() {
  ensureStyles();
  patchStateWithBreathing();
  renderBreathingPanel();
  refreshVisibleButtons();
}

installListeners();
window.addEventListener('load', tick);
new MutationObserver(() => tick()).observe(document.documentElement, { childList: true, subtree: true });
setTimeout(tick, 250);
setTimeout(tick, 850);
setTimeout(tick, 1600);
