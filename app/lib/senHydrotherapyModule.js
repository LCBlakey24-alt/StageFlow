import { demoFramework, demoLearners, demoLessons } from '../data/demoData.js';
import { loadAppState, saveAppState } from './localStore.js';

const PROGRAMME = 'SEN Hydrotherapy';
const DIARY_KEY = 'stageflow-sen-hydrotherapy-diary';
const FIVE_YEARS_MS = 5 * 365.25 * 24 * 60 * 60 * 1000;

const HYDRO_STAGES = [
  'Hydrotherapy Access & Safety',
  'Hydrotherapy Water Confidence',
  'Hydrotherapy Movement & Regulation',
  'Hydrotherapy Communication & Independence'
];

const HYDRO_CRITERIA = {
  'Hydrotherapy Access & Safety': [
    'Transitions to poolside routine with agreed support',
    'Enters the water safely using the agreed method',
    'Exits the water safely using the agreed method',
    'Tolerates required buoyancy aid or support equipment',
    'Responds to agreed safety cue, signal or object of reference',
    'Settles after transition within the agreed support level'
  ],
  'Hydrotherapy Water Confidence': [
    'Accepts water temperature and pool environment with support',
    'Maintains calm breathing while supported in the water',
    'Allows supported floating or buoyancy position',
    'Explores water with hands, feet or body movement',
    'Tolerates splash, pouring or face-adjacent water as appropriate',
    'Shows enjoyment, curiosity or relaxed engagement in water activity'
  ],
  'Hydrotherapy Movement & Regulation': [
    'Completes agreed warm-up movement with support',
    'Uses supported kicking, reaching or pushing action',
    'Maintains or improves supported posture in the water',
    'Practises range-of-motion activity at agreed comfort level',
    'Uses water activity to support regulation or relaxation',
    'Recovers from challenge or change using agreed calming strategy'
  ],
  'Hydrotherapy Communication & Independence': [
    'Communicates choice, preference or refusal using agreed method',
    'Follows a one-step cue with agreed prompt level',
    'Waits, takes turns or anticipates routine sequence',
    'Shows increased independence in one part of the routine',
    'Uses visual, verbal, gesture, object or AAC support as planned',
    'Finishes session with agreed transition support'
  ]
};

const HYDRO_GROUPS = [
  { id: 'sen-hydro-baseline', name: 'SEN Hydrotherapy Baseline', detail: 'Access, safety, settling and water confidence baseline', stages: ['Hydrotherapy Access & Safety', 'Hydrotherapy Water Confidence'], colour: 'blue', programme: PROGRAMME },
  { id: 'sen-hydro-movement', name: 'SEN Hydrotherapy Movement', detail: 'Movement, regulation, communication and independence goals', stages: ['Hydrotherapy Movement & Regulation', 'Hydrotherapy Communication & Independence'], colour: 'orange', programme: PROGRAMME },
  { id: 'sen-hydro-full', name: 'SEN Hydrotherapy Full Plan', detail: 'All hydrotherapy access, confidence, movement and communication criteria', stages: HYDRO_STAGES, colour: 'gold', programme: PROGRAMME }
];

const fallbackState = {
  screen: 'home', step: 'list', currentDay: 'Tuesday', timetableFilter: 'All', active: demoLessons[0]?.id || '', selected: '', assessmentMode: 'swimmer', lessons: demoLessons, learners: demoLearners, framework: demoFramework, certificates: [], staff: [], pack: {}, audit: []
};

function readState() { return loadAppState(fallbackState); }
function writeState(state) { saveAppState(state); }
function unique(list = []) { return [...new Set(list.filter(Boolean))]; }
function today() { return new Date().toISOString().slice(0, 10); }
function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function retentionDate(dateText) { const date = dateText ? new Date(`${dateText}T00:00:00`) : new Date(); return new Date(date.getTime() + FIVE_YEARS_MS).toISOString().slice(0, 10); }

function getEntries() {
  try { const parsed = JSON.parse(window.localStorage.getItem(DIARY_KEY) || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
function setEntries(entries) { window.localStorage.setItem(DIARY_KEY, JSON.stringify(entries)); }

function ensureHydroFramework() {
  const state = readState();
  const framework = state.framework || demoFramework;
  const criteria = { ...(framework.criteria || {}) };
  HYDRO_STAGES.forEach(stage => { criteria[stage] = unique([...(criteria[stage] || []), ...(HYDRO_CRITERIA[stage] || [])]); });
  const groupById = new Map((framework.groupTemplates || []).map(group => [group.id, group]));
  HYDRO_GROUPS.forEach(group => {
    const saved = groupById.get(group.id) || {};
    groupById.set(group.id, { ...group, ...saved, stages: unique([...group.stages, ...(saved.stages || [])]), programme: PROGRAMME });
  });
  const groupTemplates = Array.from(groupById.values());
  const next = {
    ...state,
    programmes: unique([...(state.programmes || []), PROGRAMME]),
    framework: { ...framework, stages: unique([...(framework.stages || []), ...HYDRO_STAGES]), criteria, groupTemplates, groups: groupTemplates.map(group => `${group.name}: ${group.detail || ''}`) }
  };
  if (JSON.stringify(state.framework) !== JSON.stringify(next.framework) || !(state.programmes || []).includes(PROGRAMME)) writeState(next);
  return next;
}

function createDemoSession() {
  const state = ensureHydroFramework();
  const existing = (state.lessons || []).find(lesson => lesson.programme === PROGRAMME);
  const lessonId = existing?.id || `sen-hydro-${Date.now()}`;
  const childId = (state.learners || []).find(learner => learner.lesson === lessonId)?.id || `sen-child-${Date.now()}`;
  const lesson = existing || { id: lessonId, day: 'Friday', time: '10:00', duration: 30, school: 'SEN Hydrotherapy Pool', year: 'Hydrotherapy group', className: 'Demo only', coach: 'Lewis', name: 'SEN Hydrotherapy Demo', programme: PROGRAMME, groupTemplateId: 'sen-hydro-full', mode: 'Stages + National Curriculum' };
  const hasLearner = (state.learners || []).some(learner => learner.lesson === lessonId);
  const learners = hasLearner ? state.learners : [...(state.learners || []), { id: childId, lesson: lessonId, name: 'Hydro Demo Learner', stage: 'Hydrotherapy Access & Safety', att: 'Present', res: {}, dist: { front: '0m', back: '0m' }, nc: {}, breathing: {} }];
  writeState({ ...state, lessons: existing ? state.lessons : [...(state.lessons || []), lesson], learners, active: lessonId, selected: childId, screen: 'timetable', step: 'register', currentDay: lesson.day, audit: unique([...(state.audit || []), 'Created SEN Hydrotherapy demo session']) });
  window.location.reload();
}

function downloadDiaryCsv() {
  const state = ensureHydroFramework();
  const learnerById = new Map((state.learners || []).map(learner => [learner.id, learner.name]));
  const lessonById = new Map((state.lessons || []).map(lesson => [lesson.id, lesson.name]));
  const headers = ['entryDate', 'child', 'session', 'mood', 'regulation', 'supportLevel', 'communication', 'activities', 'whatWentWell', 'nextStep', 'note', 'staffInitials', 'createdAt', 'retentionUntil'];
  const rows = getEntries().map(entry => headers.map(header => {
    const value = header === 'child' ? learnerById.get(entry.learnerId) : header === 'session' ? lessonById.get(entry.lessonId) : entry[header] || '';
    return `"${String(value || '').replace(/"/g, '""')}"`;
  }).join(','));
  const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `stage-flow-sen-hydrotherapy-diary-${today()}.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 300);
}

function addStyles() {
  if (document.getElementById('stageflow-sen-hydrotherapy-style')) return;
  const style = document.createElement('style');
  style.id = 'stageflow-sen-hydrotherapy-style';
  style.textContent = `.sen-hydro-card{border-top:5px solid #0891b2;background:linear-gradient(180deg,#ecfeff,#fff)!important}.sen-hydro-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.sen-hydro-field{display:flex;flex-direction:column;gap:5px;font-weight:900;color:#12365f}.sen-hydro-field span{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#60738a}.sen-hydro-field input,.sen-hydro-field select,.sen-hydro-field textarea{border:1px solid #dbe7f3;border-radius:14px;padding:10px 11px;font:inherit;background:#fff;color:#071527}.sen-hydro-field textarea{min-height:74px;resize:vertical}.sen-hydro-warning{border:1px solid #fed7aa;background:#fff7ed;color:#9a3412;border-radius:16px;padding:10px 12px;font-weight:850}.sen-hydro-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.sen-hydro-timeline{display:grid;gap:8px;margin-top:12px}.sen-hydro-entry{border:1px solid #dbe7f3;border-radius:16px;padding:10px 12px;background:#fff}.sen-hydro-entry small{display:block;color:#60738a;font-weight:850;margin-top:4px}@media(max-width:850px){.sen-hydro-grid{grid-template-columns:1fr}}`;
  document.head.appendChild(style);
}

function field(label, name, control) { return `<label class="sen-hydro-field"><span>${escapeHtml(label)}</span>${control.replaceAll('__name__', escapeHtml(name))}</label>`; }
function option(value, selected = false) { return `<option value="${escapeHtml(value)}" ${selected ? 'selected' : ''}>${escapeHtml(value)}</option>`; }

function renderTimeline(container, learnerId) {
  const entries = getEntries().filter(entry => entry.learnerId === learnerId).sort((a, b) => String(b.entryDate || '').localeCompare(String(a.entryDate || '')) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  container.innerHTML = entries.length ? entries.map(entry => `<div class="sen-hydro-entry"><b>${escapeHtml(entry.entryDate || 'No date')} · ${escapeHtml(entry.mood || 'Diary note')}</b><small>Support: ${escapeHtml(entry.supportLevel || 'Not set')} · Communication: ${escapeHtml(entry.communication || 'Not set')} · Retain until ${escapeHtml(entry.retentionUntil || '')}</small><p>${escapeHtml(entry.note || entry.whatWentWell || 'No note written.')}</p>${entry.nextStep ? `<small>Next step: ${escapeHtml(entry.nextStep)}</small>` : ''}</div>`).join('') : '<p class="muted">No diary notes saved for this learner yet.</p>';
}

function activeHydroContext() {
  const state = ensureHydroFramework();
  const lesson = (state.lessons || []).find(item => item.id === state.active);
  if (!lesson || lesson.programme !== PROGRAMME) return { state, lesson: null, learners: [] };
  return { state, lesson, learners: (state.learners || []).filter(learner => learner.lesson === lesson.id) };
}

function addDiaryPanel() {
  const { state, lesson, learners } = activeHydroContext();
  const hero = document.querySelector('main .hero');
  if (!lesson || !hero || document.querySelector('[data-sen-hydro-diary-panel]')) return;
  const selectedId = learners.find(learner => learner.id === state.selected)?.id || learners[0]?.id || '';
  const section = document.createElement('section');
  section.className = 'card sen-hydro-card';
  section.dataset.senHydroDiaryPanel = 'true';
  section.innerHTML = `<h2>SEN Hydrotherapy diary</h2><p class="muted">Save a dated diary note and build a timeline for each child. This is demo/local storage until Supabase Auth + RLS is connected.</p><div class="sen-hydro-warning">Demo safety: do not enter real SEN, medical, safeguarding or identifiable child details yet.</div><div class="sen-hydro-grid" style="margin-top:12px;">${field('Learner', 'learnerId', `<select data-name="__name__">${learners.map(learner => `<option value="${escapeHtml(learner.id)}" ${learner.id === selectedId ? 'selected' : ''}>${escapeHtml(learner.name)}</option>`).join('')}</select>`)}${field('Session date', 'entryDate', `<input data-name="__name__" type="date" value="${today()}">`)}${field('Mood / settling', 'mood', `<select data-name="__name__">${['Calm','Settled with support','Unsure','Excited','Distressed','Tired'].map(x => option(x)).join('')}</select>`)}${field('Regulation', 'regulation', `<select data-name="__name__">${['Regulated','Needed co-regulation','Variable','Overwhelmed','Relaxed by end'].map(x => option(x)).join('')}</select>`)}${field('Support level', 'supportLevel', `<select data-name="__name__">${['Independent','Verbal prompt','Visual/object cue','Light physical support','Full physical support','Two staff support'].map(x => option(x)).join('')}</select>`)}${field('Communication', 'communication', `<select data-name="__name__">${['Verbal','Gesture','Eye gaze','Object of reference','Visuals / PECS','AAC','Not observed today'].map(x => option(x)).join('')}</select>`)}${field('Activities completed', 'activities', '<textarea data-name="__name__" placeholder="Supported floating, kicking with float, relaxation activity..."></textarea>')}${field('What went well', 'whatWentWell', '<textarea data-name="__name__" placeholder="What did they enjoy, tolerate, attempt, or improve today?"></textarea>')}${field('Next step', 'nextStep', '<textarea data-name="__name__" placeholder="What should staff try next time?"></textarea>')}${field('General diary note', 'note', '<textarea data-name="__name__" placeholder="Nursery-style daily note for the child timeline..."></textarea>')}${field('Staff initials', 'staffInitials', '<input data-name="__name__" placeholder="LB">')}</div><div class="sen-hydro-actions"><button class="btn org" data-sen-save-note>Save diary note</button><button class="btn" data-sen-export-diary>Download diary CSV</button></div><div class="sen-hydro-timeline" data-sen-timeline></div>`;
  hero.insertAdjacentElement('afterend', section);
  const learnerSelect = section.querySelector('[data-name="learnerId"]');
  const timeline = section.querySelector('[data-sen-timeline]');
  renderTimeline(timeline, learnerSelect?.value || selectedId);
  learnerSelect?.addEventListener('change', () => renderTimeline(timeline, learnerSelect.value));
  section.querySelector('[data-sen-export-diary]')?.addEventListener('click', downloadDiaryCsv);
  section.querySelector('[data-sen-save-note]')?.addEventListener('click', () => {
    const data = {};
    section.querySelectorAll('[data-name]').forEach(input => { data[input.dataset.name] = input.value || ''; });
    if (!data.learnerId) return;
    const entry = { id: `sen-note-${Date.now()}`, lessonId: lesson.id, learnerId: data.learnerId, entryDate: data.entryDate || today(), mood: data.mood || '', regulation: data.regulation || '', supportLevel: data.supportLevel || '', communication: data.communication || '', activities: data.activities || '', whatWentWell: data.whatWentWell || '', nextStep: data.nextStep || '', note: data.note || '', staffInitials: data.staffInitials || '', createdAt: new Date().toISOString(), retentionUntil: retentionDate(data.entryDate || today()) };
    setEntries([...getEntries(), entry]);
    ['activities','whatWentWell','nextStep','note'].forEach(name => { const input = section.querySelector(`[data-name="${name}"]`); if (input) input.value = ''; });
    renderTimeline(timeline, data.learnerId);
  });
}

function addProgrammeOptions() {
  document.querySelectorAll('select').forEach(select => {
    const labels = Array.from(select.options).map(opt => opt.textContent?.trim());
    const looksLikeProgramme = labels.includes('School Swimming') || labels.includes('Gymnastics') || labels.includes('School PE');
    if (!looksLikeProgramme || labels.includes(PROGRAMME)) return;
    select.appendChild(Object.assign(document.createElement('option'), { value: PROGRAMME, textContent: PROGRAMME }));
  });
}

function addOverviewCard() {
  const state = ensureHydroFramework();
  const main = document.querySelector('main');
  const hero = main?.querySelector('.hero');
  if (!main || !hero || document.querySelector('[data-sen-hydro-overview]') || !['home', 'health', 'reports', 'settings'].includes(state.screen || 'home')) return;
  const section = document.createElement('section');
  section.className = 'card sen-hydro-card';
  section.dataset.senHydroOverview = 'true';
  section.innerHTML = `<h2>SEN Hydrotherapy module</h2><p class="muted">Demo workflow for hydrotherapy criteria, daily diary notes and child timelines. Cloud database, login and RLS are planned in the Supabase blueprint before real pupil data is used.</p><div class="grid stat-grid"><div class="card stat-card"><h2>${HYDRO_STAGES.length}</h2><p class="muted">Hydrotherapy sections</p></div><div class="card stat-card"><h2>${HYDRO_GROUPS.length}</h2><p class="muted">Criteria groups</p></div><div class="card stat-card"><h2>${getEntries().length}</h2><p class="muted">Diary notes on this device</p></div></div><div class="sen-hydro-actions"><button class="btn org" data-sen-create-demo>Create demo hydrotherapy session</button><button class="btn" data-sen-export-diary>Download diary CSV</button></div><p class="muted">Security status: local/demo only. Real SEN records need Supabase Auth, Row Level Security, audit logs and the school retention policy switched on first.</p>`;
  hero.insertAdjacentElement('afterend', section);
  section.querySelector('[data-sen-create-demo]')?.addEventListener('click', createDemoSession);
  section.querySelector('[data-sen-export-diary]')?.addEventListener('click', downloadDiaryCsv);
}

function enhance() {
  addStyles();
  ensureHydroFramework();
  addProgrammeOptions();
  addOverviewCard();
  addDiaryPanel();
}

window.addEventListener('load', enhance);
new MutationObserver(enhance).observe(document.documentElement, { childList: true, subtree: true });
window.setTimeout(enhance, 250);
window.setTimeout(enhance, 900);
