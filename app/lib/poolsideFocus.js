const STATE_KEY = 'stageflow-state';
const FILTER_KEY = 'stageflow-poolside-filter';

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage can fail in private mode; the helper should never break the app.
  }
}

function getState() {
  return readJson(STATE_KEY, null);
}

function currentLesson(state) {
  return state?.lessons?.find(lesson => lesson.id === state.active) || null;
}

function currentLearner(state, lesson) {
  if (!lesson) return null;
  return state.learners?.find(learner => learner.id === state.selected)
    || state.learners?.find(learner => learner.lesson === lesson.id && learner.att !== 'Absent')
    || state.learners?.find(learner => learner.lesson === lesson.id)
    || null;
}

function criteriaForLesson(state, lesson) {
  if (!state || !lesson || lesson.mode === 'National Curriculum only') return [];
  const group = state.framework?.groupTemplates?.find(item => item.id === lesson.groupTemplateId);
  const stages = group?.stages || [];
  const criteria = stages.flatMap(stage => state.framework?.criteria?.[stage] || []);
  return [...new Set(criteria)];
}

function resultFor(learner, criteria) {
  return learner?.res?.[criteria] || 'no';
}

function labelForResult(value) {
  if (value === 'pass') return 'Passed';
  if (value === 'float') return 'Almost there';
  return 'Not assessed';
}

function isBreathingCriteria(text) {
  const lower = String(text || '').toLowerCase();
  return lower.includes('breath') || lower.includes('bubbles') || lower.includes('exhale');
}

function isDistanceCriteria(text) {
  const lower = String(text || '').toLowerCase();
  return /\b\d+\s*m\b/.test(lower) || lower.includes('one width') || lower.includes('one length');
}

function getFilter() {
  return readJson(FILTER_KEY, 'all') || 'all';
}

function setFilter(filter) {
  writeJson(FILTER_KEY, filter);
}

function shouldShow(criteria, learner, filter) {
  const result = resultFor(learner, criteria);
  if (filter === 'left') return result !== 'pass';
  if (filter === 'needs') return result === 'float';
  if (filter === 'not-assessed') return !result || result === 'no';
  if (filter === 'passed') return result === 'pass';
  if (filter === 'breathing') return isBreathingCriteria(criteria);
  if (filter === 'distance') return isDistanceCriteria(criteria);
  return true;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function addStyles() {
  if (document.getElementById('stageflow-poolside-focus-style')) return;
  const style = document.createElement('style');
  style.id = 'stageflow-poolside-focus-style';
  style.textContent = `
    .poolside-focus-panel {
      border-left-color: #f97316 !important;
      background: linear-gradient(180deg, #fff8f1, #ffffff) !important;
      margin: 10px 0 !important;
    }
    .poolside-focus-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 8px;
    }
    .poolside-focus-head strong {
      display: block;
      font-size: 18px;
    }
    .poolside-focus-head small {
      display: block;
      color: #60738a;
      font-weight: 850;
      margin-top: 2px;
    }
    .poolside-focus-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(95px, 1fr));
      gap: 7px;
      margin: 8px 0;
    }
    .poolside-stat {
      border: 1px solid #f6d5b9;
      background: #fff;
      border-radius: 12px;
      padding: 8px;
      font-weight: 1000;
    }
    .poolside-stat small {
      display: block;
      color: #60738a;
      font-size: 11px;
      margin-top: 2px;
      font-weight: 850;
    }
    .poolside-filters, .poolside-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin-top: 8px;
    }
    .poolside-filter, .poolside-nav button {
      border: 1px solid #dbe7f3;
      background: #fff;
      color: #071527;
      border-radius: 999px;
      padding: 7px 10px;
      font-weight: 1000;
      font-size: 12px;
    }
    .poolside-filter.on {
      background: #071527;
      color: #fff;
      border-color: #071527;
      box-shadow: inset 0 -3px 0 #f97316;
    }
    .poolside-nav button {
      background: #f97316;
      color: #fff;
      border-color: #f97316;
    }
    .poolside-status-badge {
      display: inline-flex;
      width: fit-content;
      border-radius: 999px;
      padding: 4px 8px;
      margin-top: 6px;
      font-size: 11px;
      font-weight: 1000;
      background: #edf6ff;
      color: #12365f;
    }
    .poolside-status-badge.pass {
      background: #dcfce7;
      color: #14532d;
    }
    .poolside-status-badge.float {
      background: #ffedd5;
      color: #9a3412;
    }
    .skill-card.poolside-hidden {
      display: none !important;
    }
    .skill-card.poolside-breathing {
      border-left-color: #0ea5e9 !important;
    }
    .skill-card.poolside-distance {
      border-left-color: #16a34a !important;
    }
    @media (max-width: 850px) {
      .poolside-focus-panel {
        position: sticky;
        top: 58px;
        z-index: 4;
      }
      .poolside-focus-head {
        display: block;
      }
      .poolside-filters, .poolside-nav {
        overflow-x: auto;
        flex-wrap: nowrap;
        padding-bottom: 2px;
      }
      .poolside-filter, .poolside-nav button {
        white-space: nowrap;
      }
    }
  `;
  document.head.appendChild(style);
}

function renderPanel(state, lesson, learner, criteria) {
  const card = document.querySelector('.assessment-card');
  if (!card || !learner) return;

  let panel = card.querySelector('[data-stageflow-poolside-focus]');
  if (!panel) {
    panel = document.createElement('section');
    panel.className = 'poolside-focus-panel folder';
    panel.dataset.stageflowPoolsideFocus = 'true';
    const breathingPanel = card.querySelector('[data-stageflow-breathing-panel]');
    const head = card.querySelector('.assessment-head');
    if (breathingPanel) breathingPanel.insertAdjacentElement('beforebegin', panel);
    else if (head) head.insertAdjacentElement('afterend', panel);
    else card.prepend(panel);
  }

  const passed = criteria.filter(item => resultFor(learner, item) === 'pass').length;
  const needs = criteria.filter(item => resultFor(learner, item) === 'float').length;
  const notAssessed = criteria.filter(item => !resultFor(learner, item) || resultFor(learner, item) === 'no').length;
  const breathingLeft = criteria.filter(item => isBreathingCriteria(item) && resultFor(learner, item) !== 'pass').length;
  const filter = getFilter();
  const filters = [
    ['all', 'All'],
    ['left', 'Left'],
    ['not-assessed', 'Not assessed'],
    ['needs', 'Needs work'],
    ['breathing', 'Breathing'],
    ['distance', 'Distance'],
    ['passed', 'Passed']
  ];

  panel.innerHTML = `
    <div class="poolside-focus-head">
      <div>
        <strong>Poolside focus</strong>
        <small>${escapeHtml(learner.name)} · ${escapeHtml(lesson.name || 'Current session')}</small>
      </div>
      <span class="pill">${passed}/${criteria.length} passed</span>
    </div>
    <div class="poolside-focus-stats">
      <div class="poolside-stat">${criteria.length - passed}<small>left</small></div>
      <div class="poolside-stat">${notAssessed}<small>not assessed</small></div>
      <div class="poolside-stat">${needs}<small>almost there</small></div>
      <div class="poolside-stat">${breathingLeft}<small>breathing left</small></div>
    </div>
    <div class="poolside-filters">
      ${filters.map(([value, label]) => `<button class="poolside-filter ${filter === value ? 'on' : ''}" data-poolside-filter="${value}">${label}</button>`).join('')}
    </div>
    <div class="poolside-nav">
      <button data-poolside-nav="previous">← Previous swimmer</button>
      <button data-poolside-nav="next">Next swimmer →</button>
    </div>
  `;
}

function applyCardBadgesAndFilter(state, lesson, learner) {
  if (!learner) return;
  const filter = getFilter();
  document.querySelectorAll('.assessment-card .skill-card').forEach(card => {
    const title = card.querySelector('b')?.textContent?.trim() || '';
    if (!title) return;
    const result = resultFor(learner, title);
    const hidden = !shouldShow(title, learner, filter);
    card.classList.toggle('poolside-hidden', hidden);
    card.classList.toggle('poolside-breathing', isBreathingCriteria(title));
    card.classList.toggle('poolside-distance', isDistanceCriteria(title));

    let badge = card.querySelector('[data-poolside-status-badge]');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'poolside-status-badge';
      badge.dataset.poolsideStatusBadge = 'true';
      const titleEl = card.querySelector('b');
      titleEl?.insertAdjacentElement('afterend', badge);
    }
    badge.className = `poolside-status-badge ${result}`;
    badge.textContent = labelForResult(result);
  });
}

function clickLearner(direction) {
  const buttons = Array.from(document.querySelectorAll('.learner-button'));
  if (!buttons.length) return;
  const currentIndex = Math.max(0, buttons.findIndex(button => button.classList.contains('on')));
  const nextIndex = direction === 'previous'
    ? (currentIndex - 1 + buttons.length) % buttons.length
    : (currentIndex + 1) % buttons.length;
  buttons[nextIndex]?.click();
}

function renderFocus() {
  addStyles();
  const state = getState();
  const lesson = currentLesson(state);
  const learner = currentLearner(state, lesson);
  const criteria = criteriaForLesson(state, lesson);
  if (!lesson || !learner || !document.querySelector('.assessment-card')) return;
  renderPanel(state, lesson, learner, criteria);
  applyCardBadgesAndFilter(state, lesson, learner);
}

function installHandlers() {
  if (window.__stageFlowPoolsideFocusInstalled) return;
  window.__stageFlowPoolsideFocusInstalled = true;
  document.addEventListener('click', event => {
    const filterButton = event.target.closest('[data-poolside-filter]');
    if (filterButton) {
      setFilter(filterButton.dataset.poolsideFilter || 'all');
      window.setTimeout(renderFocus, 20);
      return;
    }

    const navButton = event.target.closest('[data-poolside-nav]');
    if (navButton) {
      clickLearner(navButton.dataset.poolsideNav || 'next');
      window.setTimeout(renderFocus, 80);
      return;
    }

    if (event.target.closest('.score-btn') || event.target.closest('.learner-button') || event.target.closest('[data-breathing-level]')) {
      window.setTimeout(renderFocus, 180);
      window.setTimeout(renderFocus, 420);
    }
  }, true);
}

installHandlers();
window.addEventListener('load', renderFocus);
new MutationObserver(() => renderFocus()).observe(document.documentElement, { childList: true, subtree: true });
setTimeout(renderFocus, 250);
setTimeout(renderFocus, 900);
