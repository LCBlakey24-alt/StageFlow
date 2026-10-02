import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';
import { demoFramework, demoLearners, demoLessons, nationalCurriculum, stageCriteria, programmeAreas } from './data/demoData.js';
import { loadAppState, saveAppState, clearAppState } from './lib/localStore.js';
import { listLocalEvidence, saveLocalEvidence, deleteLocalEvidence } from './lib/localMediaStore.js';
import { StageFlowAccountGate, StaffAccountsPanel } from './lib/accountAuth.jsx';
import { createOrganisationWorkspace, loadOrganisationStaff, loadOrganisationWorkspace, mergeWorkspaceSnapshot, newOrganisationWorkspace, saveOrganisationWorkspace, workspaceSnapshot } from './lib/cloudWorkspace.js';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const COACH_SESSION_KEY = 'stageflow-coach-session';

function todayWeekday() {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
}

function readCoachSessionStaffId() {
  try { return window.sessionStorage.getItem(COACH_SESSION_KEY) || ''; } catch { return ''; }
}

function saveCoachSessionStaffId(id) {
  try { window.sessionStorage.setItem(COACH_SESSION_KEY, id || ''); } catch {}
}

function clearCoachSessionStaffId() {
  try { window.sessionStorage.removeItem(COACH_SESSION_KEY); } catch {}
}

function linkedAccountStaff() {
  try {
    const linked = window.sessionStorage.getItem('stageflow-account-staff');
    if (!linked) return null;
    const account = JSON.parse(linked);
    return account?.id && account?.name && account?.role ? account : null;
  } catch {
    return null;
  }
}

function isCloudAccountSession() {
  return !!linkedAccountStaff()?.accountStaffId;
}

function coachSessionStaff(state) {
  const account = linkedAccountStaff();
  if (account) return account;

  const id = readCoachSessionStaffId();
  return (state.staff || []).find(staff => staff.id === id) || null;
}

function lessonAssignedToStaff(lesson, staff) {
  if (!lesson || !staff) return false;
  const assignment = String(lesson.coachId || '');
  const ids = new Set([
    String(staff.id || ''),
    String(staff.accountStaffId || ''),
    staff.accountStaffId ? `account:${staff.accountStaffId}` : ''
  ].filter(Boolean));

  if (assignment && ids.has(assignment)) return true;
  return String(lesson.coach || '').trim() === String(staff.name || '').trim();
}
const durations = [15, 30, 45, 60, 75, 90, 105, 120];
const modes = ['Stages + National Curriculum', 'Stages only', 'National Curriculum only'];
const attendanceOptions = ['Present', 'Absent', 'Late', 'Not Taking Part'];
const legacyScores = ['no', 'float', 'pass'];

function assessmentOptions(state) {
  const labels = Array.isArray(state.framework?.passMarks) && state.framework.passMarks.length >= 2
    ? state.framework.passMarks
    : ['Needs practice', 'Almost there', 'Passed'];
  return labels.map((label, index) => ({
    value: index === labels.length - 1 ? 'pass' : `mark-${index}`,
    label
  }));
}

function resultMatchesOption(value, option, index, options) {
  if (value === option.value) return true;
  // Keep older demo results readable after the configurable scale upgrade.
  if (value === 'float' && index === Math.max(0, options.length - 2)) return true;
  return false;
}
const distances = ['0m', '5m', '10m', '15m', '20m', '25m', '50m', '100m'];
const defaultProgrammes = ['School Swimming', 'Evening Swim 1:1', 'Evening Swim Group', 'Private Lessons', 'School PE', 'Gymnastics', 'Custom'];
const programmes = programmeAreas?.length ? programmeAreas : defaultProgrammes;
const programmeFilters = ['All', ...programmes];
const swimStages = ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5', 'Stage 6', 'Stage 7', 'Self Rescue Award'];
const gymnasticsStages = ['Gymnastics Beginner', 'Gymnastics Improver', 'Gymnastics Advanced'];
const schoolPeStages = ['PE Fundamentals', 'PE Games Skills', 'PE Teamwork & Leadership'];
const assessmentModes = [
  { id: 'swimmer', title: 'Individual' },
  { id: 'skill', title: 'Group' }
];

const starter = {
  screen: 'home',
  step: 'list',
  tab: 'groups',
  selected: '',
  selectedSkill: '',
  assessmentMode: 'swimmer',
  sessionRecords: {},
  activeOccurrenceDate: '',
  active: 'l1',
  draft: null,
  currentDay: 'Tuesday',
  timetableFilter: 'All',
  lessons: demoLessons.map(l => ({ day: 'Tuesday', duration: 30, className: '', coach: '', groupTemplateId: defaultGroupForProgramme(l.programme || demoFramework.area || 'School Swimming', demoFramework.groupTemplates), programme: normaliseProgrammeName(l.programme || demoFramework.area || 'School Swimming'), features: { assessment: true, notes: true, evidence: true }, ...l, programme: normaliseProgrammeName(l.programme || demoFramework.area || 'School Swimming') })),
  learners: demoLearners,
  framework: demoFramework,
  certificates: [
    { id: 'cert1', name: 'Highest Stage Certificate', rule: 'Highest achieved stage', font: 'Serif', size: 34, groupBy: 'Year group' },
    { id: 'cert2', name: 'National Curriculum Certificate', rule: 'National Curriculum achieved', font: 'Sans Serif', size: 28, groupBy: 'Award' }
  ],
  staff: [
    { id: 's1', name: 'Lewis', role: 'Coach', accessCode: '13579', sessions: true, groups: false, learners: true, assess: true, export: false, framework: false, certificates: false },
    { id: 's2', name: 'Charlotte', role: 'Admin', accessCode: '80421', sessions: true, groups: true, learners: true, assess: true, export: true, framework: true, certificates: true }
  ],
  pack: { reports: true, certificates: true, registers: true, nc: true, support: true, raw: false, email: 'office@greenfieldprimary.co.uk', cc: 'manager@example.com', method: 'Secure download link' },
  audit: ['Core programme wording cleaned']
};

function normaliseProgrammeName(programme) {
  const value = String(programme || '').trim();
  if (!value) return 'School Swimming';
  if (value === 'Evening Swim Lessons') return 'Evening Swim Group';
  if (value === '1:1 Lessons' || value === 'One-to-one Lessons' || value === 'Evening 1:1') return 'Evening Swim 1:1';
  if (value === 'Group Lessons') return 'Evening Swim Group';
  return programmes.includes(value) ? value : value;
}
function timeToMinutes(time) {
  const [h, m] = String(time || '00:00').split(':').map(Number);
  return ((Number.isFinite(h) ? h : 0) * 60) + (Number.isFinite(m) ? m : 0);
}
function formatTime(total) {
  const minutesInDay = 24 * 60;
  const safeTotal = ((Number(total) % minutesInDay) + minutesInDay) % minutesInDay;
  const hh = String(Math.floor(safeTotal / 60)).padStart(2, '0');
  const mm = String(safeTotal % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}
function addMinutes(time, minutes) { return formatTime(timeToMinutes(time) + (Number(minutes) || 0)); }

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateForWeekday(day, reference = new Date()) {
  const target = Math.max(0, days.indexOf(day));
  const current = (reference.getDay() + 6) % 7;
  const result = new Date(reference);
  result.setHours(12, 0, 0, 0);
  result.setDate(result.getDate() + (target - current));
  return localDateKey(result);
}

function displayOccurrenceDate(dateKey) {
  if (!dateKey) return '';
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function occurrenceKey(lessonId, dateKey) {
  return `${lessonId}::${dateKey}`;
}

function occurrenceFor(state, lessonId, dateKey) {
  return state.sessionRecords?.[occurrenceKey(lessonId, dateKey)] || null;
}

function learnerSessionSnapshot(learner) {
  return {
    att: learner.att || 'Present',
    res: { ...(learner.res || {}) },
    dist: { ...(learner.dist || { front: '0m', back: '0m' }) },
    nc: { ...(learner.nc || {}) },
    sessionNote: learner.sessionNote || ''
  };
}

function openSessionOccurrence(current, lesson, dateKey) {
  const key = occurrenceKey(lesson.id, dateKey);
  const existing = current.sessionRecords?.[key] || null;
  const now = new Date().toISOString();

  const learners = current.learners.map(learner => {
    if (learner.lesson !== lesson.id) return learner;
    const saved = existing?.learners?.[learner.id];
    if (saved) {
      return {
        ...learner,
        att: saved.att || 'Present',
        res: saved.res || learner.res || {},
        dist: saved.dist || learner.dist || { front: '0m', back: '0m' },
        nc: saved.nc || learner.nc || {},
        sessionNote: saved.sessionNote || ''
      };
    }
    return { ...learner, att: 'Present', sessionNote: '' };
  });

  return {
    ...current,
    learners,
    sessionRecords: {
      ...(current.sessionRecords || {}),
      [key]: {
        lessonId: lesson.id,
        date: dateKey,
        startedAt: existing?.startedAt || now,
        completedAt: existing?.completedAt || '',
        learners: existing?.learners || {}
      }
    },
    active: lesson.id,
    activeOccurrenceDate: dateKey,
    currentDay: lessonDay(lesson),
    step: 'register'
  };
}

function updateLearnerOccurrence(current, lessonId, dateKey, learnerId, patch) {
  let changedLearner = null;
  const learners = current.learners.map(learner => {
    if (learner.id !== learnerId) return learner;
    changedLearner = { ...learner, ...patch };
    return changedLearner;
  });
  if (!changedLearner) return current;

  const key = occurrenceKey(lessonId, dateKey);
  const existing = current.sessionRecords?.[key] || {};
  return {
    ...current,
    learners,
    sessionRecords: {
      ...(current.sessionRecords || {}),
      [key]: {
        lessonId,
        date: dateKey,
        startedAt: existing.startedAt || new Date().toISOString(),
        completedAt: existing.completedAt || '',
        learners: {
          ...(existing.learners || {}),
          [learnerId]: learnerSessionSnapshot(changedLearner)
        }
      }
    }
  };
}

function completeSessionOccurrence(current, lesson, dateKey) {
  const key = occurrenceKey(lesson.id, dateKey);
  const existing = current.sessionRecords?.[key] || {};
  const now = new Date().toISOString();
  const snapshots = {};
  current.learners
    .filter(learner => learner.lesson === lesson.id)
    .forEach(learner => {
      snapshots[learner.id] = learnerSessionSnapshot(learner);
    });

  return {
    ...current,
    sessionRecords: {
      ...(current.sessionRecords || {}),
      [key]: {
        lessonId: lesson.id,
        date: dateKey,
        startedAt: existing.startedAt || now,
        completedAt: now,
        learners: snapshots
      }
    },
    step: 'list',
    active: '',
    activeOccurrenceDate: '',
    selected: '',
    selectedSkill: ''
  };
}

function lessonDay(lesson) { return lesson?.day || 'Tuesday'; }
function groups(state) { return state.framework?.groupTemplates || []; }
function groupFor(state, id) { return groups(state).find(g => g.id === id); }
function stageSortValue(stage) {
  const label = String(stage || '');
  const match = label.match(/Stage\s*(\d+)/i);
  if (match) return Number(match[1]);
  if (label.toLowerCase().includes('self rescue')) return 900;
  if (label.toLowerCase().includes('gymnastics')) return 1000;
  if (label.toLowerCase().startsWith('pe ')) return 1100;
  return 1200;
}
function criteriaStagesForProgramme(programme, allStages = []) {
  const normal = normaliseProgrammeName(programme);
  if (['School Swimming', 'Evening Swim 1:1', 'Evening Swim Group', 'Private Lessons'].includes(normal)) return swimStages.filter(stage => allStages.includes(stage) || stageCriteria?.[stage]);
  if (normal === 'Gymnastics') return gymnasticsStages.filter(stage => allStages.includes(stage) || stageCriteria?.[stage]);
  if (normal === 'School PE') return schoolPeStages.filter(stage => allStages.includes(stage) || stageCriteria?.[stage]);
  return allStages;
}
function programmeForGroup(group) {
  if (group?.programme) return normaliseProgrammeName(group.programme);
  const text = `${group?.name || ''} ${group?.detail || ''} ${(group?.stages || []).join(' ')}`.toLowerCase();
  if (text.includes('gymnastics')) return 'Gymnastics';
  if (text.includes('pe ')) return 'School PE';
  if (text.includes('1:1') || group?.allStages) return 'Evening Swim 1:1';
  if (text.includes('evening')) return 'Evening Swim Group';
  return 'School Swimming';
}
function defaultGroupForProgramme(programme, groupTemplates = []) {
  const normal = normaliseProgrammeName(programme);
  const exact = groupTemplates.find(group => programmeForGroup(group) === normal);
  if (exact) return exact.id;
  if (normal === 'Evening Swim 1:1') return groupTemplates.find(group => group.allStages || group.id === 'eg121')?.id || groupTemplates[0]?.id || '';
  if (normal === 'Gymnastics') return groupTemplates.find(group => (group.stages || []).some(stage => String(stage).includes('Gymnastics')))?.id || groupTemplates[0]?.id || '';
  if (normal === 'School PE') return groupTemplates.find(group => (group.stages || []).some(stage => String(stage).startsWith('PE ')))?.id || groupTemplates[0]?.id || '';
  return groupTemplates[0]?.id || '';
}
function firstStageForGroup(state, groupId) {
  const group = groupFor(state, groupId);
  return group?.stages?.[0] || state.framework?.stages?.[0] || 'Stage 1';
}
function lessonProgramme(lesson) {
  if (lesson?.programme) return normaliseProgrammeName(lesson.programme);
  const text = `${lesson?.school || ''} ${lesson?.name || ''} ${lesson?.year || ''}`.toLowerCase();
  if (text.includes('1:1') || text.includes('one-to-one')) return 'Evening Swim 1:1';
  if (text.includes('evening')) return 'Evening Swim Group';
  if (text.includes('private')) return 'Private Lessons';
  if (text.includes('gym')) return 'Gymnastics';
  if (text.includes('pe')) return 'School PE';
  return 'School Swimming';
}
function defaultSchoolForProgramme(programme) {
  const normal = normaliseProgrammeName(programme);
  if (normal === 'Evening Swim 1:1') return 'Evening Swim 1:1';
  if (normal === 'Evening Swim Group') return 'Evening Swim Group';
  if (normal === 'Private Lessons') return 'Private Client';
  if (normal === 'Gymnastics') return 'Gymnastics Venue';
  if (normal === 'School PE') return 'School PE Venue';
  return 'New School';
}
function defaultLessonNameForProgramme(programme) {
  const normal = normaliseProgrammeName(programme);
  if (normal === 'Evening Swim 1:1') return 'New 1:1 Session';
  if (normal === 'Evening Swim Group') return 'New Evening Swim Group';
  if (normal === 'Private Lessons') return 'New Private Lesson';
  if (normal === 'Gymnastics') return 'New Gymnastics Session';
  if (normal === 'School PE') return 'New PE Class';
  if (normal === 'Custom') return 'New Custom Activity';
  return 'New Class / Session';
}
function visibleLessonsForDay(state, day) {
  const filter = normaliseProgrammeName(state.timetableFilter || 'All');
  return [...state.lessons].filter(l => lessonDay(l) === day && (filter === 'All' || lessonProgramme(l) === filter));
}
function groupStages(state, lesson) {
  const group = groupFor(state, lesson?.groupTemplateId);
  return [...(group?.stages || [])].sort((a, b) => stageSortValue(a) - stageSortValue(b));
}
function criteriaForStage(state, stage) {
  return state.framework?.criteria?.[stage] || stageCriteria?.[stage] || [];
}
function lessonFeature(lesson, key, fallback = true) {
  if (!lesson?.features || typeof lesson.features !== 'object' || lesson.features[key] === undefined) return fallback;
  return lesson.features[key] !== false;
}

function groupCriteria(state, lesson) {
  if (!lesson || !lessonFeature(lesson, 'assessment', true) || lesson.mode === 'National Curriculum only') return [];
  const stages = groupStages(state, lesson);
  return [...new Set(stages.flatMap(stage => criteriaForStage(state, stage)))];
}

function learnerCriteria(state, lesson, learner) {
  const group = groupFor(state, lesson?.groupTemplateId);
  const stages = groupStages(state, lesson);
  if (!lesson || !learner || !lessonFeature(lesson, 'assessment', true) || lesson.mode === 'National Curriculum only') return [];

  // 1:1/all-stage sessions intentionally expose the complete group framework.
  if (group?.allStages || lessonProgramme(lesson) === 'Evening Swim 1:1') {
    return groupCriteria(state, lesson);
  }

  if (learner.stage && stages.includes(learner.stage)) {
    return [...new Set(criteriaForStage(state, learner.stage))];
  }

  return groupCriteria(state, lesson);
}
function groupLabel(state, lesson) {
  const group = groupFor(state, lesson?.groupTemplateId);
  return group ? `${group.name} · ${group.detail || group.stages?.join(', ') || 'Criteria group'}` : 'No criteria group selected';
}
function groupOptionsForLesson(state, lesson) {
  const programme = lessonProgramme(lesson);
  const matching = groups(state).filter(group => programmeForGroup(group) === programme || programmeForGroup(group) === 'Custom');
  const usable = matching.length ? matching : groups(state);
  return usable.map(g => ({ value: g.id, label: `${g.name} — ${g.detail || g.stages?.join(', ') || 'Criteria group'}` }));
}
function noCriteriaLabel(lesson) {
  if (!lessonFeature(lesson, 'assessment', true)) return 'Assessment off';
  const usesNationalCurriculum = lessonProgramme(lesson) === 'School Swimming' && lesson?.mode !== 'Stages only';
  return usesNationalCurriculum ? 'National Curriculum only' : 'No assessment criteria';
}

function completionText(state, lesson, learner) {
  const criteria = learnerCriteria(state, lesson, learner);
  if (!criteria.length) return noCriteriaLabel(lesson);
  const passed = criteria.filter(c => learner?.res?.[c] === 'pass').length;
  return `${passed}/${criteria.length} criteria passed`;
}

function isMarkedAssessment(value) {
  return value === 'float' || value === 'pass' || String(value || '').startsWith('mark-');
}

function childAssessmentSummary(criteria, learner, lesson) {
  if (!criteria.length) return noCriteriaLabel(lesson);
  const marked = criteria.filter(skill => isMarkedAssessment(learner?.res?.[skill])).length;
  const passed = criteria.filter(skill => learner?.res?.[skill] === 'pass').length;
  if (!marked) return 'Not marked yet';
  return `${marked}/${criteria.length} marked · ${passed} passed`;
}
function createLearnersFromText(text, lessonId, groupStage) {
  return (text || '').split('\n').map(x => x.trim()).filter(Boolean).map((name, index) => ({
    id: 'p' + Date.now() + index,
    lesson: lessonId,
    name,
    stage: groupStage,
    att: 'Present',
    res: {},
    dist: { front: '0m', back: '0m' },
    nc: {},
    notes: []
  }));
}

function isStandaloneStageFlow() {
  try {
    return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
  } catch {
    return false;
  }
}

function isInstalledAppLaunch() {
  try {
    const params = new URLSearchParams(window.location.search || '');
    return params.get('app') === '1' || isStandaloneStageFlow();
  } catch {
    return isStandaloneStageFlow();
  }
}

function loadInitialAppState() {
  const loaded = loadAppState(starter);
  if (!isInstalledAppLaunch()) return loaded;

  // Require fresh staff access each time the installed app starts, while
  // keeping ordinary refreshes in the same app session signed in.
  try {
    const launchKey = 'stageflow-installed-launch-active';
    if (!window.sessionStorage.getItem(launchKey)) {
      clearCoachSessionStaffId();
      window.sessionStorage.setItem(launchKey, '1');
    }
  } catch {}

  if (!readCoachSessionStaffId()) {
    return { ...loaded, screen: 'timetable', step: 'list', active: '', selected: '', selectedSkill: '' };
  }
  return loaded;
}

class StageFlowErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Stage Flow recovered from a UI error', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <div className='app-error-shell'>
      <section className='card app-error-card'>
        <h1>Stage Flow hit a problem</h1>
        <p className='muted'>Your saved demo data has not been cleared. Reload the app, or return to staff access.</p>
        <div className='app-error-actions'>
          <button className='btn org' onClick={() => window.location.reload()}>Reload app</button>
          <button className='btn' onClick={() => {
            clearCoachSessionStaffId();
            window.location.assign(isInstalledAppLaunch() ? '/?app=1' : '/');
          }}>Staff access</button>
        </div>
      </section>
    </div>;
  }
}

function App({ accountMode = false, accountStaff = null, onAccountSignOut = null }) {
  const [state, setState] = useState(() => loadInitialAppState());
  const [hydroStatus, setHydroStatus] = useState('idle');
  const [authVersion, setAuthVersion] = useState(0);
  const [cloudStatus, setCloudStatus] = useState(accountMode ? 'loading' : 'local');
  const [cloudMessage, setCloudMessage] = useState('');
  const cloudRevisionRef = useRef(0);
  const cloudReadyRef = useRef(!accountMode);
  const skipCloudSaveRef = useRef(true);
  const cloudSaveQueueRef = useRef(Promise.resolve());
  const accountOrgId = accountStaff?.organisationId || '';

  async function enableHydrotherapy() {
    if (hydroStatus === 'loading' || hydroStatus === 'enabled') return;
    setHydroStatus('loading');
    try {
      await import('./lib/senHydrotherapyModule.js');
      setHydroStatus('enabled');
    } catch (error) {
      console.error('Stage Flow SEN Hydrotherapy demo failed to load', error);
      setHydroStatus('error');
    }
  }

  function update(next) {
    setState(current => {
      const newState = typeof next === 'function' ? next(current) : { ...current, ...next };
      if (!accountMode) saveAppState(newState);
      return newState;
    });
  }

  useEffect(() => {
    if (!accountMode || !accountOrgId) {
      cloudReadyRef.current = !accountMode;
      setCloudStatus(accountMode ? 'loading' : 'local');
      return undefined;
    }

    let cancelled = false;
    const initialSnapshot = newOrganisationWorkspace(state);
    cloudReadyRef.current = false;
    skipCloudSaveRef.current = true;
    setCloudStatus('loading');
    setCloudMessage('');

    async function bootCloudWorkspace() {
      try {
        const [remote, organisationStaff] = await Promise.all([
          loadOrganisationWorkspace(accountOrgId),
          loadOrganisationStaff(accountOrgId)
        ]);

        if (cancelled) return;

        let shared = remote?.state || null;
        let revision = Number(remote?.revision) || 0;

        if (!shared) {
          const created = await createOrganisationWorkspace(accountOrgId, initialSnapshot);
          if (cancelled) return;
          shared = created.state;
          revision = created.revision;
        }

        cloudRevisionRef.current = revision;
        setState(current => ({
          ...mergeWorkspaceSnapshot(current, shared),
          staff: organisationStaff.length ? organisationStaff : current.staff
        }));

        // Authenticated organisation data should live in Supabase, not the
        // unscoped browser demo cache.
        clearAppState();
        cloudReadyRef.current = true;
        skipCloudSaveRef.current = true;
        setCloudStatus('ready');
      } catch (error) {
        console.error('Stage Flow workspace failed to load', error);
        if (cancelled) return;
        cloudReadyRef.current = false;
        setCloudMessage(error?.message || 'Could not load the organisation workspace.');
        setCloudStatus('error');
      }
    }

    bootCloudWorkspace();
    return () => {
      cancelled = true;
    };
  }, [accountMode, accountOrgId]);

  useEffect(() => {
    if (!accountMode || !accountOrgId || !cloudReadyRef.current) return undefined;
    if (skipCloudSaveRef.current) {
      skipCloudSaveRef.current = false;
      return undefined;
    }

    const snapshot = workspaceSnapshot(state);
    const timer = window.setTimeout(() => {
      cloudSaveQueueRef.current = cloudSaveQueueRef.current
        .then(async () => {
          if (!cloudReadyRef.current) return;
          setCloudStatus('saving');
          setCloudMessage('');
          const saved = await saveOrganisationWorkspace(accountOrgId, snapshot, cloudRevisionRef.current);
          if (saved.conflict) {
            cloudReadyRef.current = false;
            setCloudStatus('conflict');
            setCloudMessage('Another device saved newer Stage Flow data. Reload to use the latest version.');
            return;
          }
          cloudRevisionRef.current = saved.revision;
          setCloudStatus('ready');
        })
        .catch(error => {
          console.error('Stage Flow workspace failed to save', error);
          setCloudMessage(error?.message || 'Changes could not be synced.');
          setCloudStatus('error');
        });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [
    accountMode,
    accountOrgId,
    state.lessons,
    state.learners,
    state.sessionRecords,
    state.framework,
    state.certificates,
    state.pack,
    state.audit
  ]);


  function unlockStaff(id) {
    saveCoachSessionStaffId(id);
    setAuthVersion(version => version + 1);
  }

  function lockStaff() {
    clearCoachSessionStaffId();
    setAuthVersion(version => version + 1);
    update({ screen: isInstalledAppLaunch() ? 'timetable' : 'home', step: 'list', active: '', selected: '', selectedSkill: '' });
  }

  void authVersion;

  if (accountMode && cloudStatus === 'loading') {
    return <div className='account-loading'>Loading your Stage Flow workspace…</div>;
  }

  if (accountMode && cloudStatus === 'error' && !cloudReadyRef.current) {
    return <div className='account-gate'>
      <section className='card account-unlinked'>
        <h1>Workspace unavailable</h1>
        <p className='muted'>{cloudMessage || 'Stage Flow could not securely load this organisation.'}</p>
        <div className='app-error-actions'>
          <button className='btn org' onClick={() => window.location.reload()}>Try again</button>
          {onAccountSignOut && <button className='btn' onClick={onAccountSignOut}>Sign out</button>}
        </div>
      </section>
    </div>;
  }

  const lesson = state.lessons.find(l => l.id === state.active);
  const activeStaff = accountStaff || coachSessionStaff(state);
  const coachOnly = !!activeStaff && activeStaff.role !== 'Admin';
  const protectedScreen = state.screen !== 'home';
  const needsUnlock = protectedScreen && !activeStaff;
  const screens = !activeStaff
    ? ['home', 'timetable']
    : coachOnly
      ? ['home', ...(activeStaff.sessions === false ? [] : ['timetable'])]
      : [
          'home',
          ...(activeStaff.sessions === false ? [] : ['timetable']),
          'health',
          ...(activeStaff.export === false ? [] : ['reports']),
          'settings'
        ];
  const currentScreen = screens.includes(state.screen) ? state.screen : 'home';
  const lessonAllowed = !!lesson && !!activeStaff && (
    activeStaff.role === 'Admin' ||
    (activeStaff.sessions !== false && activeStaff.learners !== false && lessonAssignedToStaff(lesson, activeStaff))
  );

  return <>
    <div className='top'>
      <div className='brand'>Stage Flow</div>
      <div className='top-actions'>
        {accountMode && <span className={'cloud-sync-status ' + cloudStatus}>{cloudStatus === 'saving' ? 'Saving…' : cloudStatus === 'conflict' ? 'Sync conflict' : cloudStatus === 'error' ? 'Sync issue' : 'Cloud synced'}</span>}
        {activeStaff && <button className='btn' onClick={onAccountSignOut || lockStaff}>{onAccountSignOut ? 'Sign out' : 'Lock'}</button>}
      </div>
    </div>
    {accountMode && cloudStatus === 'conflict' && <div className='cloud-conflict-banner'>
      <span>{cloudMessage}</span>
      <button className='btn' onClick={() => window.location.reload()}>Reload latest</button>
    </div>}
    <div className='wrap'>
      <nav className={'rail ' + (coachOnly ? 'coach-rail' : '')}>{screens.map(screen => {
        const label = screen === 'reports' ? 'Progress' : screen[0].toUpperCase() + screen.slice(1);
        return <button key={screen} className={currentScreen === screen ? 'on' : ''} onClick={() => update({ screen, step: 'list', active: screen === 'timetable' ? state.active : '' })}>{label}</button>;
      })}</nav>
      <main>
        {needsUnlock ? <CoachPinGate state={state} onUnlock={unlockStaff} /> : <>
          {currentScreen === 'home' && (!activeStaff
            ? <Home state={state} update={update} hydroStatus={hydroStatus} enableHydrotherapy={enableHydrotherapy} />
            : coachOnly
              ? <CoachHome state={state} update={update} staff={activeStaff} />
              : <AdminHome state={state} update={update} staff={activeStaff} />)}
          {currentScreen === 'timetable' && state.step === 'list' && <Timetable state={state} update={update} />}
          {currentScreen === 'timetable' && state.step !== 'list' && (
            !lesson
              ? <MissingLesson update={update} />
              : lessonAllowed
                ? <Lesson state={state} update={update} lesson={lesson} />
                : <SessionAccessDenied update={update} />
          )}
          {currentScreen === 'health' && <HealthCheck state={state} update={update} />}
          {currentScreen === 'reports' && <Reports state={state} update={update} />}
          {currentScreen === 'settings' && <Settings state={state} update={update} />}
        </>}
      </main>
    </div>
  </>;
}

function InstallStageFlowCard({ update }) {
  const CANONICAL_INSTALL_URL = 'https://stage-flow-three.vercel.app/';
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => isStandaloneStageFlow());
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    function beforeInstall(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }
    function didInstall() {
      setInstalled(true);
      setInstallPrompt(null);
      setShowHelp(false);
    }

    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', didInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', didInstall);
    };
  }, []);

  const isAppleMobile = /iphone|ipad|ipod/i.test(window.navigator.userAgent || '') ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  const isAndroid = /android/i.test(window.navigator.userAgent || '');
  const onCanonicalHost = window.location.hostname === 'stage-flow-three.vercel.app';

  function openInstallBrowser() {
    if (isAndroid) {
      const fallback = encodeURIComponent(CANONICAL_INSTALL_URL);
      window.location.href = `intent://stage-flow-three.vercel.app/#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
      return;
    }
    window.open(CANONICAL_INSTALL_URL, '_blank', 'noopener,noreferrer');
  }

  async function install() {
    if (installed) {
      update({ screen: 'timetable', step: 'list', active: '' });
      return;
    }
    if (!onCanonicalHost) {
      openInstallBrowser();
      return;
    }
    if (!installPrompt) {
      setShowHelp(true);
      return;
    }
    installPrompt.prompt();
    try {
      const choice = await installPrompt.userChoice;
      if (choice?.outcome === 'accepted') setInstalled(true);
    } finally {
      setInstallPrompt(null);
    }
  }

  return <section className='card install-stageflow-card'>
    <div className='install-stageflow-copy'>
      <span className='install-app-mark'>SF</span>
      <div>
        <p className='install-kicker'>{installed ? 'Installed' : 'Phone & tablet app'}</p>
        <h2>{installed ? 'Stage Flow is on this device' : 'Install Stage Flow'}</h2>
        <p className='muted'>{installed
          ? 'Open staff access whenever you are ready.'
          : onCanonicalHost
            ? 'Install Stage Flow on this device. The app icon opens directly to staff access.'
            : 'Open the permanent Stage Flow site in your browser first, then install it to your home screen.'}</p>
      </div>
    </div>
    <button className='btn org install-stageflow-button' onClick={install}>
      {installed ? 'Open staff access' : onCanonicalHost ? 'Install app' : 'Open in Chrome to install'}
    </button>
    {showHelp && <div className='install-help'>
      <strong>{isAppleMobile ? 'On iPhone or iPad' : 'Install from this browser'}</strong>
      <p>{isAppleMobile
        ? 'In Safari, tap Share, then choose Add to Home Screen.'
        : 'Open the browser menu and choose Install app or Add to Home screen.'}</p>
    </div>}
  </section>;
}

function Home({ state, update, hydroStatus, enableHydrotherapy }) {
  return <>
    <section className='hero stage-hero'><h1>Teach. Track. Progress.</h1><p>Timetables, attendance, notes and optional assessment for coached activities.</p></section>
    <section className='quick-actions'>
      <button className='action-card primary-action' onClick={() => update({ screen: 'timetable', step: 'list', active: '' })}><span>Start Assessment</span></button>
      <button className='action-card' onClick={() => update({ screen: 'timetable', step: 'list', active: '' })}><span>My Timetable</span></button>
      <button className='action-card' onClick={() => update({ screen: 'settings', tab: 'groups', step: 'list', active: '' })}><span>Criteria Groups</span></button>
      <button className='action-card' onClick={() => update({ screen: 'reports', step: 'list', active: '' })}><span>Progress</span></button>
    </section>
    <section className='card public-access-card'>
      <h2>Staff access</h2>
      <p className='muted'>Session details, venues, learner information and assessments are protected behind your staff code.</p>
      <button className='btn org' onClick={() => update({ screen: 'timetable', step: 'list', active: '' })}>Enter staff code</button>
    </section>
    <InstallStageFlowCard update={update} />
    <section className='card hydro-home-card'>
      <h2>SEN Hydrotherapy <span className='pill'>Demo</span></h2>
      <button className='btn org' onClick={() => update({ screen: 'timetable', step: 'list', active: '' })}>Staff access required</button>
      <p className='muted' style={{ marginTop: 8 }}>Protected demo area — don’t use real pupil data yet.</p>
    </section>
  </>;
}

function AdminHome({ state, update, staff }) {
  const day = todayWeekday();
  const lessons = [...state.lessons]
    .filter(lesson => lessonDay(lesson) === day)
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  return <>
    <section className='hero stage-hero coach-home-hero'><h1>{staff.name}</h1><p>Admin · {day}</p></section>
    <section className='quick-actions admin-home-actions'>
      <button className='action-card primary-action' onClick={() => update({ screen: 'timetable', step: 'list', active: '' })}><span>Open timetable</span></button>
      <button className='action-card' onClick={() => update({ screen: 'settings', tab: 'groups', step: 'list', active: '' })}><span>Criteria & settings</span></button>
      <button className='action-card' onClick={() => update({ screen: 'reports', step: 'list', active: '' })}><span>Progress & reports</span></button>
    </section>
    <section className='card coach-day-card'>
      <div className='coach-day-head'><h2>Today</h2><span className='pill'>{lessons.length} session{lessons.length === 1 ? '' : 's'}</span></div>
      <div className='coach-lesson-list'>
        {lessons.length ? lessons.map(lesson => <CoachLessonBar key={lesson.id} state={state} lesson={lesson} update={update} />) : <p className='muted'>No sessions scheduled today.</p>}
      </div>
    </section>
  </>;
}

function CoachHome({ state, update, staff }) {
  const day = todayWeekday();
  const lessons = [...state.lessons]
    .filter(lesson => lessonDay(lesson) === day && lessonAssignedToStaff(lesson, staff))
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  return <>
    <section className='hero stage-hero coach-home-hero'><h1>{staff.name}</h1><p>{day}</p></section>
    <section className='card coach-day-card'>
      <div className='coach-day-head'><h2>Today</h2><span className='pill'>{lessons.length} session{lessons.length === 1 ? '' : 's'}</span></div>
      <div className='coach-lesson-list'>
        {lessons.length ? lessons.map(lesson => <CoachLessonBar key={lesson.id} state={state} lesson={lesson} update={update} occurrenceDate={localDateKey()} />) : <p className='muted'>No sessions assigned today.</p>}
      </div>
    </section>
    <button className='btn org coach-full-button' onClick={() => update({ screen: 'timetable', step: 'list' })}>Open timetable</button>
  </>;
}


function CoachPinGate({ state, onUnlock }) {
  const [digits, setDigits] = useState(['', '', '', '', '']);
  const [error, setError] = useState('');

  function tryUnlock(nextDigits) {
    const code = nextDigits.join('');
    if (code.length !== 5) return;
    const matches = (state.staff || []).filter(person => String(person.accessCode || '') === code);
    if (!matches.length) {
      setError('Code not recognised');
      return;
    }
    if (matches.length > 1) {
      setError('This code is duplicated — ask an admin for a new code');
      return;
    }
    setError('');
    onUnlock(matches[0].id);
  }

  function setDigit(index, raw, input) {
    const clean = String(raw || '').replace(/\D/g, '');
    if (clean.length > 1) {
      const pasted = clean.slice(0, 5).split('');
      const next = ['', '', '', '', ''];
      pasted.forEach((digit, offset) => { if (index + offset < 5) next[index + offset] = digit; });
      setDigits(next);
      if (next.every(Boolean)) tryUnlock(next);
      return;
    }
    const next = [...digits];
    next[index] = clean.slice(-1);
    setDigits(next);
    setError('');
    if (next[index] && index < 4) input?.nextElementSibling?.focus();
    if (next.every(Boolean)) window.setTimeout(() => tryUnlock(next), 60);
  }

  function keyDown(index, event) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.currentTarget.previousElementSibling?.focus();
    }
  }

  return <>
    <section className='hero compact-hero'><h1>Coach access</h1></section>
    <section className='card coach-pin-card'>
      <h2>Enter your 5-digit code</h2>
      <div className='coach-pin-row'>
        {digits.map((digit, index) => <input
          key={index}
          className='coach-pin-input'
          value={digit}
          aria-label={`Code digit ${index + 1}`}
          inputMode='numeric'
          pattern='[0-9]*'
          maxLength={1}
          autoFocus={index === 0}
          onChange={event => setDigit(index, event.target.value, event.currentTarget)}
          onKeyDown={event => keyDown(index, event)}
          onPaste={event => {
            const text = event.clipboardData?.getData('text') || '';
            if (/^\d{5}$/.test(text)) {
              event.preventDefault();
              const next = text.split('');
              setDigits(next);
              tryUnlock(next);
            }
          }}
        />)}
      </div>
      {error && <p className='coach-pin-error'>{error}</p>}
      <p className='muted'>Your code opens only the sessions and tools you have permission to use.</p>
    </section>
  </>;
}

function CoachLessonBar({ state, lesson, update, occurrenceDate = localDateKey() }) {
  const learners = state.learners.filter(learner => learner.lesson === lesson.id);
  const occurrence = occurrenceFor(state, lesson.id, occurrenceDate);
  const isDone = !!occurrence?.completedAt;
  const isStarted = !!occurrence?.startedAt && !isDone;

  function openLesson() {
    update(current => openSessionOccurrence(current, lesson, occurrenceDate));
  }

  return <button className={'coach-lesson-bar ' + (isDone ? 'done' : isStarted ? 'started' : '')} onClick={openLesson}>
    <span className='coach-lesson-time'>{lesson.time}</span>
    <span className='coach-lesson-main'><strong>{lesson.name}</strong><small>{lesson.school} · {learners.length} learner{learners.length === 1 ? '' : 's'}</small></span>
    <span className='coach-lesson-status'>{isDone ? '✓ Saved' : isStarted ? 'Continue' : 'Open'}</span>
  </button>;
}

function CoachToday({ state, update, staff }) {
  const day = todayWeekday();
  const lessons = [...state.lessons]
    .filter(lesson => lessonDay(lesson) === day)
    .filter(lesson => staff.role === 'Admin' || lessonAssignedToStaff(lesson, staff))
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  return <section className='card coach-day-card'>
    <div className='coach-day-head'><div><p className='muted'>Today</p><h2>{day}</h2></div><span className='pill'>{lessons.length} session{lessons.length === 1 ? '' : 's'}</span></div>
    <div className='coach-lesson-list'>
      {lessons.length ? lessons.map(lesson => <CoachLessonBar key={lesson.id} state={state} lesson={lesson} update={update} occurrenceDate={localDateKey()} />) : <p className='muted'>No sessions assigned today.</p>}
    </div>
  </section>;
}

function CoachWeek({ state, update, staff }) {
  const coachLessons = [...state.lessons]
    .filter(lesson => staff.role === 'Admin' || lessonAssignedToStaff(lesson, staff))
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  return <div className='coach-week-grid'>
    {days.map(day => {
      const lessons = coachLessons.filter(lesson => lessonDay(lesson) === day);
      const occurrenceDate = dateForWeekday(day);
      return <section className='card coach-week-day' key={day}>
        <div className='coach-week-day-head'><div><h2>{day}</h2><small>{displayOccurrenceDate(occurrenceDate)}</small></div><span>{lessons.length}</span></div>
        <div className='coach-lesson-list'>
          {lessons.length ? lessons.map(lesson => <CoachLessonBar key={lesson.id} state={state} lesson={lesson} update={update} occurrenceDate={occurrenceDate} />) : <p className='muted'>No sessions</p>}
        </div>
      </section>;
    })}
  </div>;
}

function SessionSetupWizard({ state, update, initialDay, onClose }) {
  const [step, setStep] = useState(0);
  const [programme, setProgramme] = useState('School Swimming');
  const [day, setDay] = useState(initialDay || 'Monday');
  const [count, setCount] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState(30);
  const [gap, setGap] = useState(0);
  const [venue, setVenue] = useState(defaultSchoolForProgramme('School Swimming'));
  const [features, setFeatures] = useState({ assessment: true, notes: true, evidence: false });
  const [customName, setCustomName] = useState('Custom activity');

  function typeLabel(value) {
    if (value === 'School Swimming') return 'Swimming';
    if (value === 'Evening Swim Group') return 'Evening swimming';
    if (value === 'Evening Swim 1:1') return '1:1 swimming';
    if (value === 'Private Lessons') return 'Private swimming';
    if (value === 'School PE') return 'PE';
    if (value === 'Custom') return 'Custom activity';
    return value;
  }

  function availableStagesFor(nextProgramme) {
    const normal = normaliseProgrammeName(nextProgramme);
    const fromGroups = groups(state)
      .filter(group => programmeForGroup(group) === normal)
      .flatMap(group => group.stages || []);

    if (normal === 'Custom') return [...new Set(fromGroups)];

    const fromFramework = criteriaStagesForProgramme(normal, state.framework?.stages || []);
    return [...new Set([...fromFramework, ...fromGroups])];
  }

  const stageOptions = availableStagesFor(programme);
  const defaultStage = stageOptions[0] || '';
  const [sessions, setSessions] = useState([{ time: '09:00', stage: defaultStage, coachId: '', coach: '' }]);

  const staffOptions = [
    { value: '', label: 'Unassigned', name: '' },
    ...(state.staff || []).map(person => ({ value: person.id, label: `${person.name} · ${person.role}`, name: person.name }))
  ];

  useEffect(() => {
    const generated = Array.from({ length: count }, (_, index) => ({
      time: addMinutes(startTime, index * (Number(duration) + Number(gap))),
      stage: sessions[index]?.stage || defaultStage,
      coachId: sessions[index]?.coachId || '',
      coach: sessions[index]?.coach || ''
    }));
    setSessions(generated);
  }, [count, startTime, duration, gap]);

  function chooseProgramme(next) {
    const normal = normaliseProgrammeName(next);
    const nextStages = availableStagesFor(normal);
    const nextDefaultStage = nextStages[0] || '';
    setProgramme(normal);
    setVenue(defaultSchoolForProgramme(normal));
    if (normal === 'Custom' && nextStages.length === 0) {
      setFeatures(current => ({ ...current, assessment: false }));
    }
    setSessions(current => current.map(item => ({ ...item, stage: nextDefaultStage })));
  }

  function patchSession(index, patch) {
    setSessions(current => current.map((session, i) => i === index ? { ...session, ...patch } : session));
  }

  function slug(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function createSessions() {
    let templates = [...groups(state)];

    function groupIdForStage(stage) {
      const exact = templates.find(group =>
        programmeForGroup(group) === programme &&
        Array.isArray(group.stages) &&
        group.stages.length === 1 &&
        group.stages[0] === stage
      );
      if (exact) return exact.id;

      const id = `auto-${slug(programme)}-${slug(stage || (programme === 'Custom' ? customName : 'general'))}`;
      if (!templates.some(group => group.id === id)) {
        templates.push({
          id,
          name: stage || (programme === 'Custom' ? (customName.trim() || 'Custom activity') : typeLabel(programme)),
          detail: stage ? `${stage} criteria` : (features.assessment ? `${typeLabel(programme)} criteria` : 'No assessment criteria'),
          stages: stage ? [stage] : [],
          colour: 'blue',
          programme
        });
      }
      return id;
    }

    const now = Date.now();
    const newLessons = sessions.map((session, index) => {
      const groupId = groupIdForStage(session.stage);
      const label = programme === 'Custom' ? (customName.trim() || 'Custom activity') : (session.stage || typeLabel(programme));
      const assignedStaff = (state.staff || []).find(person => person.id === session.coachId);
      return {
        id: `l${now}-${index + 1}`,
        day,
        time: session.time,
        duration: Number(duration) || 30,
        school: venue || defaultSchoolForProgramme(programme),
        year: 'Year group',
        className: '',
        coachId: session.coachId || '',
        coach: assignedStaff?.name || session.coach || '',
        name: count > 1 ? `${label} · Session ${index + 1}` : label,
        programme,
        groupTemplateId: groupId,
        mode: programme === 'School Swimming' ? 'Stages + National Curriculum' : 'Stages only',
        features: { ...features }
      };
    });

    update({
      framework: { ...state.framework, groupTemplates: templates },
      lessons: [...state.lessons, ...newLessons],
      currentDay: day,
      step: 'list',
      active: '',
      timetableFilter: programme,
      audit: [...(state.audit || []), `Created ${newLessons.length} ${typeLabel(programme)} session${newLessons.length === 1 ? '' : 's'} on ${day}`]
    });
    onClose();
  }

  const steps = ['Lesson type', 'When', 'Sessions & tools'];

  return <section className='card session-wizard'>
    <div className='session-wizard-top'>
      <div><p className='muted'>Quick session setup</p><h2>{steps[step]}</h2></div>
      <button className='btn session-wizard-close' onClick={onClose}>Close</button>
    </div>

    <div className='session-wizard-steps compact-wizard-steps'>
      {steps.map((label, index) => <button
        key={label}
        className={(index === step ? 'on ' : '') + (index < step ? 'done' : '')}
        onClick={() => index <= step && setStep(index)}
      ><span>{index + 1}</span><b>{label}</b></button>)}
    </div>

    {step === 0 && <div>
      <p className='wizard-question'>What are you teaching?</p>
      <div className='wizard-choice-grid lesson-type-grid'>
        {programmes.map(option => <button key={option} className={'wizard-choice ' + (programme === option ? 'on' : '')} onClick={() => chooseProgramme(option)}><strong>{typeLabel(option)}</strong></button>)}
      </div>
      {programme === 'Custom' && <div className='custom-activity-name'>
        <Field label='Activity / club name' value={customName} onChange={setCustomName} placeholder='Basketball club, rebound therapy, dance…' />
        <p className='muted'>Custom activities can be timetable-only, or you can add criteria groups later in Settings.</p>
      </div>}
    </div>}

    {step === 1 && <div className='wizard-schedule'>
      <p className='wizard-question'>When do these sessions happen?</p>
      <div className='day-mini-grid'>
        {days.map(option => <button key={option} className={day === option ? 'on' : ''} onClick={() => setDay(option)}>{option.slice(0, 3)}</button>)}
      </div>
      <div className='grid2 wizard-time-controls'>
        <div className='field'><label>How many sessions?</label><select value={String(count)} onChange={event => setCount(Number(event.target.value) || 1)}>{[1,2,3,4,5,6,7,8,9,10].map(number => <option key={number} value={number}>{number}</option>)}</select></div>
        <div className='field'><label>First session</label><input type='time' value={startTime} onChange={event => setStartTime(event.target.value)} /></div>
        <Select label='Duration' value={String(duration)} onChange={value => setDuration(Number(value) || 30)} options={durations.map(value => ({ value: String(value), label: `${value} minutes` }))} />
        <Select label='Gap' value={String(gap)} onChange={value => setGap(Number(value) || 0)} options={[0,5,10,15,20,30].map(value => ({ value: String(value), label: value ? `${value} minutes` : 'No gap' }))} />
      </div>
      <div className='quick-times-preview'>
        {sessions.map((session, index) => <span key={index}>{session.time}</span>)}
      </div>
    </div>}

    {step === 2 && <div className='wizard-stage-assignments'>
      <div className='wizard-shared-fields'>
        <Field label='School / venue' value={venue} onChange={setVenue} />
        <div className='session-tool-toggles'>
          <label className={'session-tool-toggle ' + (features.assessment ? 'on' : '')}>
            <input type='checkbox' checked={features.assessment} onChange={event => setFeatures(current => ({ ...current, assessment: event.target.checked }))} />
            <span><strong>Assessment</strong><small>Show criteria and progress marking</small></span>
          </label>
          <label className={'session-tool-toggle ' + (features.notes ? 'on' : '')}>
            <input type='checkbox' checked={features.notes} onChange={event => setFeatures(current => ({ ...current, notes: event.target.checked }))} />
            <span><strong>Notes</strong><small>Allow staff notes for learners</small></span>
          </label>
          <label className={'session-tool-toggle ' + (features.evidence ? 'on' : '')}>
            <input type='checkbox' checked={features.evidence} onChange={event => setFeatures(current => ({ ...current, evidence: event.target.checked }))} />
            <span><strong>Photo / video</strong><small>Configured now; secure cloud media is still disabled</small></span>
          </label>
        </div>
      </div>
      <p className='wizard-question'>{features.assessment ? 'What is each session working on?' : 'Assign each session'}</p>
      <div className='session-stage-list'>
        {sessions.map((session, index) => <div className='session-stage-row' key={index}>
          <div className='session-stage-time'>
            <span>Session {index + 1}</span>
            <input type='time' value={session.time} onChange={event => patchSession(index, { time: event.target.value })} />
          </div>
          {features.assessment ? <div className='field'>
            <label>Stage / criteria</label>
            {stageOptions.length
              ? <select value={session.stage || ''} onChange={event => patchSession(index, { stage: event.target.value })}>
                  {stageOptions.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                </select>
              : <div className='wizard-static-field'>No criteria group configured</div>}
          </div> : <div className='field'>
            <label>Assessment</label>
            <div className='wizard-static-field'>Off for this session</div>
          </div>}
          <div className='field'>
            <label>Coach</label>
            <select value={session.coachId || ''} onChange={event => {
              const option = staffOptions.find(item => item.value === event.target.value);
              patchSession(index, { coachId: event.target.value, coach: option?.name || '' });
            }}>
              {staffOptions.map(option => <option key={option.value || 'unassigned'} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </div>)}
      </div>
    </div>}

    <div className='session-wizard-footer'>
      <button className='btn' disabled={step === 0} onClick={() => setStep(current => Math.max(0, current - 1))}>Back</button>
      {step < 2
        ? <button className='btn org' onClick={() => setStep(current => current + 1)}>Continue</button>
        : <button className='btn org' disabled={!sessions.length || (features.assessment && sessions.some(session => !session.stage))} onClick={createSessions}>Create {count} session{count === 1 ? '' : 's'}</button>}
    </div>
  </section>;
}


function AdminTimetable({ state, update }) {
  const day = state.currentDay || 'Tuesday';
  const [adding, setAdding] = useState(false);
  const sorted = visibleLessonsForDay(state, day).sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  if (adding) return <SessionSetupWizard state={state} update={update} initialDay={day} onClose={() => setAdding(false)} />;

  return <>
    <section className='card calendar-toolbar'><div><h2>Admin sessions · {day}</h2><p className='muted'>Choose a day, then open or add sessions.</p></div><button className='btn org' onClick={() => setAdding(true)}>+ Add sessions</button></section>
    <div className='tabs'>{days.map(d => <button key={d} className={day === d ? 'on' : ''} onClick={() => update({ currentDay: d })}>{d}</button>)}</div>
    {sorted.length ? sorted.map(lesson => <LessonCard key={lesson.id} state={state} update={update} lesson={lesson} />) : <section className='card empty-admin-day'><h2>No sessions on {day}</h2><button className='btn org' onClick={() => setAdding(true)}>+ Add sessions</button></section>}
  </>;
}

function Timetable({ state, update }) {
  const [view, setView] = useState('today');
  const staff = coachSessionStaff(state);

  if (!staff) return <CoachPinGate state={state} onUnlock={id => { saveCoachSessionStaffId(id); update({ screen: 'timetable', step: 'list' }); }} />;

  if (staff.sessions === false) {
    return <section className='card'><h2>No timetable access</h2><p className='muted'>This staff account does not currently have session access.</p></section>;
  }

  const canManage = staff.role === 'Admin';
  return <>
    <section className='hero compact-hero coach-hero'>
      <div><p>{staff.role}</p><h1>{staff.name}</h1></div>

    </section>
    <div className='tabs coach-tabs'>
      <button className={view === 'today' ? 'on' : ''} onClick={() => setView('today')}>Today</button>
      <button className={view === 'calendar' ? 'on' : ''} onClick={() => setView('calendar')}>Calendar</button>
      {canManage && <button className={view === 'admin' ? 'on' : ''} onClick={() => setView('admin')}>Admin</button>}
    </div>
    {view === 'today' && <CoachToday state={state} update={update} staff={staff} />}
    {view === 'calendar' && <CoachWeek state={state} update={update} staff={staff} />}
    {view === 'admin' && canManage && <AdminTimetable state={state} update={update} />}
  </>;
}

function LessonCard({ state, update, lesson }) {
  const swimmers = state.learners.filter(p => p.lesson === lesson.id);
  const occurrenceDate = dateForWeekday(lessonDay(lesson));
  return <section className='card lesson'><div className='time'>{lesson.time}</div><div><h2>{lesson.name}</h2><p className='muted'>{lessonProgramme(lesson)} · {lesson.school} · {lesson.year}</p><span className='pill'>{groupLabel(state, lesson)}</span><span className='pill'>{swimmers.length} learners</span><span className='pill'>{groupCriteria(state, lesson).length} criteria</span></div><div className='score-buttons'><button className='btn' onClick={() => update({ active: lesson.id, activeOccurrenceDate: '', step: 'edit' })}>Edit</button><button className='btn org' onClick={() => update(current => openSessionOccurrence(current, lesson, occurrenceDate))}>Open</button></div></section>;
}

function SessionAccessDenied({ update }) {
  return <>
    <section className='card'>
      <h2>Session access restricted</h2>
      <p className='muted'>This session is not assigned to the signed-in coach, or this staff account does not have learner access.</p>
    </section>
    <div className='footer'>
      <button className='btn org' onClick={() => update({ screen: 'timetable', step: 'list', active: '' })}>Back to my timetable</button>
    </div>
  </>;
}

function MissingLesson({ update }) {
  return <>
    <section className='card'>
      <h2>Session no longer available</h2>
      <p className='muted'>This saved session may have been removed or changed. Return to the timetable and open it again.</p>
    </section>
    <div className='footer'>
      <button className='btn org' onClick={() => update({ screen: 'timetable', step: 'list', active: '' })}>Back to timetable</button>
    </div>
  </>;
}

function Lesson({ state, update, lesson }) {
  const staff = coachSessionStaff(state);
  const coachOnly = !!staff && staff.role !== 'Admin';
  const requestedStep = state.step || 'register';
  const currentStep = coachOnly && requestedStep === 'edit' ? 'register' : requestedStep;
  const steps = ['edit', 'register', 'assess', 'save'];
  const occurrenceDate = state.activeOccurrenceDate || localDateKey();
  return <>
    {coachOnly ? <section className='hero compact-hero lesson-coach-hero'><div><p>{displayOccurrenceDate(occurrenceDate)} · {lesson.time} · {lesson.school}</p><h1>{lesson.name}</h1></div><span>{currentStep === 'register' ? 'Register' : 'Assessment'}</span></section> : <section className='hero'><p>{lessonProgramme(lesson)}</p><h1>{lesson.name}</h1><p>{groupCriteria(state, lesson).length} criteria</p><div className='steps'>{steps.map(step => <span key={step} className={currentStep === step ? 'on' : ''}>{step === 'edit' ? 'Setup' : step === 'assess' ? 'Assess' : step}</span>)}</div></section>}
    {currentStep === 'edit' && !coachOnly && <LessonSetup state={state} update={update} lesson={lesson} />}
    {currentStep === 'register' && <Register state={state} update={update} lesson={lesson} />}
    {currentStep === 'assess' && <Assess state={state} update={update} lesson={lesson} />}
    {currentStep === 'save' && <SaveLesson state={state} update={update} lesson={lesson} />}
  </>;
}

function LessonSetup({ state, update, lesson }) {
  const templateOptions = groupOptionsForLesson(state, lesson);
  const criteria = groupCriteria(state, lesson);
  const featureState = {
    assessment: lessonFeature(lesson, 'assessment', true),
    notes: lessonFeature(lesson, 'notes', true),
    evidence: lessonFeature(lesson, 'evidence', true)
  };
  const staffOptions = [
    { value: '', label: 'Unassigned', name: '' },
    ...(state.staff || []).map(person => ({ value: person.id, label: `${person.name} · ${person.role}`, name: person.name }))
  ];
  const selectedCoachId = lesson.coachId || (state.staff || []).find(person => person.name === lesson.coach)?.id || '';
  if (lesson.coach && !selectedCoachId) {
    staffOptions.push({ value: `legacy:${lesson.coach}`, label: `${lesson.coach} · Existing assignment`, name: lesson.coach });
  }
  function patchLesson(patch) {
    update(current => {
      const currentLesson = current.lessons.find(item => item.id === lesson.id) || lesson;
      let changed = { ...currentLesson, ...patch };
      let learners = current.learners;

      if (patch.programme) {
        const programme = normaliseProgrammeName(patch.programme);
        const nextGroup = defaultGroupForProgramme(programme, groups(current));
        changed = {
          ...changed,
          programme,
          groupTemplateId: nextGroup,
          school: defaultSchoolForProgramme(programme),
          name: currentLesson.name?.startsWith('New ') ? defaultLessonNameForProgramme(programme) : currentLesson.name
        };
        learners = learners.map(p => p.lesson === lesson.id ? { ...p, stage: firstStageForGroup(current, nextGroup) } : p);
      }

      if (patch.groupTemplateId) {
        const groupStage = firstStageForGroup(current, patch.groupTemplateId);
        learners = learners.map(p => p.lesson === lesson.id ? { ...p, stage: groupStage } : p);
      }

      return {
        ...current,
        lessons: current.lessons.map(item => item.id === lesson.id ? changed : item),
        learners
      };
    });
  }

  function deleteLesson() {
    if (!window.confirm('Delete this class/session, its current learners and its saved session history?')) return;
    update(current => {
      const sessionRecords = Object.fromEntries(
        Object.entries(current.sessionRecords || {}).filter(([key, record]) =>
          record?.lessonId !== lesson.id && !key.startsWith(`${lesson.id}::`)
        )
      );

      return {
        ...current,
        lessons: current.lessons.filter(item => item.id !== lesson.id),
        learners: current.learners.filter(person => person.lesson !== lesson.id),
        sessionRecords,
        step: 'list',
        active: '',
        activeOccurrenceDate: '',
        selected: '',
        selectedSkill: ''
      };
    });
  }
  return <>
    <section className='card assessment-choice'><h2>Class/session setup</h2><div className='grid2'><Select label='Programme' value={lessonProgramme(lesson)} onChange={v => patchLesson({ programme: v })} options={programmes.map(x => ({ value: x, label: x }))} /><Select label='Criteria group' value={lesson.groupTemplateId || ''} onChange={v => patchLesson({ groupTemplateId: v })} options={templateOptions} /><Field label='Class/session name' value={lesson.name} onChange={v => patchLesson({ name: v })} /><Field label='School / venue' value={lesson.school} onChange={v => patchLesson({ school: v })} /><Field label='Year / class' value={lesson.year} onChange={v => patchLesson({ year: v })} /><Select label='Coach' value={selectedCoachId || (lesson.coach ? `legacy:${lesson.coach}` : '')} onChange={v => {
  const option = staffOptions.find(item => item.value === v);
  patchLesson({ coachId: v.startsWith('legacy:') ? '' : v, coach: option?.name || '' });
}} options={staffOptions} /><Select label='Day' value={lessonDay(lesson)} onChange={v => patchLesson({ day: v })} options={days.map(x => ({ value: x, label: x }))} /><Field label='Start time' value={lesson.time} onChange={v => patchLesson({ time: v })} /><Select label='Duration' value={String(lesson.duration || 30)} onChange={v => patchLesson({ duration: Number(v) || 30 })} options={durations.map(x => ({ value: String(x), label: `${x} minutes` }))} /><Select label='Assessment mode' value={lesson.mode || modes[0]} onChange={v => patchLesson({ mode: v })} options={modes.map(x => ({ value: x, label: x }))} /></div></section>
    <section className='card session-tools-card'>
      <h2>Session tools</h2>
      <p className='muted'>Turn features on only when this session needs them.</p>
      <div className='session-tool-toggles'>
        {[
          ['assessment', 'Assessment', 'Criteria and progress marking'],
          ['notes', 'Notes', 'Staff notes for learners'],
          ['evidence', 'Photo / video', 'Secure media capture when storage is enabled']
        ].map(([key, label, detail]) => <label className={'session-tool-toggle ' + (featureState[key] ? 'on' : '')} key={key}>
          <input type='checkbox' checked={featureState[key]} onChange={event => patchLesson({ features: { ...(lesson.features || {}), [key]: event.target.checked } })} />
          <span><strong>{label}</strong><small>{detail}</small></span>
        </label>)}
      </div>
    </section>
    <section className='card'><h2>Criteria preview</h2><p className='muted'>{groupLabel(state, lesson)}</p>{criteria.length ? criteria.map(c => <div className='folder' key={c}>• {c}</div>) : <p className='muted'>{noCriteriaLabel(lesson)}</p>}</section>
    <div className='footer'><button className='btn' onClick={() => update({ step: 'list' })}>Back to timetable</button><button className='btn' onClick={deleteLesson}>Delete</button><button className='btn org' onClick={() => update({ step: 'register' })}>Register learners</button></div>
  </>;
}

function LearnerNotesPanel({ state, update, learner, canEdit, onClose }) {
  const [draft, setDraft] = useState('');
  const [source, setSource] = useState('Parent / carer');
  const notes = Array.isArray(learner.notes) ? learner.notes : [];
  const staff = coachSessionStaff(state);

  function addNote() {
    const text = draft.trim();
    if (!text) return;
    const note = {
      id: `note-${Date.now()}`,
      text,
      source,
      author: staff?.name || 'Admin',
      createdAt: new Date().toISOString()
    };
    update(current => ({
      ...current,
      learners: current.learners.map(item => item.id === learner.id
        ? { ...item, notes: [...(Array.isArray(item.notes) ? item.notes : []), note] }
        : item)
    }));
    setDraft('');
  }

  function removeNote(noteId) {
    update(current => ({
      ...current,
      learners: current.learners.map(item => item.id === learner.id
        ? { ...item, notes: (Array.isArray(item.notes) ? item.notes : []).filter(note => note.id !== noteId) }
        : item)
    }));
  }

  return <section className='learner-notes-panel'>
    <div className='learner-notes-head'>
      <div><h3>{learner.name} · Notes</h3><p className='muted'>{notes.length ? `${notes.length} note${notes.length === 1 ? '' : 's'}` : 'No notes yet'}</p></div>
      <button className='notes-close' onClick={onClose}>Close</button>
    </div>

    {notes.length > 0 && <div className='learner-notes-list'>
      {notes.map(note => <article className='learner-note' key={note.id}>
        <div><strong>{note.source || 'Note'}</strong><span>{note.createdAt ? new Date(note.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span></div>
        <p>{note.text}</p>
        <footer><span>{note.author || 'Stage Flow'}</span>{canEdit && <button onClick={() => removeNote(note.id)}>Remove</button>}</footer>
      </article>)}
    </div>}

    {canEdit && <div className='learner-note-compose'>
      <div className='field'>
        <label>Note from</label>
        <select value={source} onChange={event => setSource(event.target.value)}>
          <option>Parent / carer</option>
          <option>Admin</option>
          <option>School</option>
          <option>Coach</option>
        </select>
      </div>
      <textarea value={draft} onChange={event => setDraft(event.target.value)} placeholder='Add the note the coach needs to see…' />
      <button className='btn org' disabled={!draft.trim()} onClick={addNote}>Add note</button>
      <p className='note-demo-warning'>Demo/local notes only — do not enter real medical, safeguarding or identifiable child information yet.</p>
    </div>}
  </section>;
}

function Register({ state, update, lesson }) {
  const kids = state.learners.filter(p => p.lesson === lesson.id);
  const lessonStages = groupStages(state, lesson);
  const [names, setNames] = useState('');
  const [openNotes, setOpenNotes] = useState('');
  const [showAllNotes, setShowAllNotes] = useState(false);
  const staff = coachSessionStaff(state);
  const coachOnly = !!staff && staff.role !== 'Admin';
  const notesEnabled = lessonFeature(lesson, 'notes', true);
  const evidenceEnabled = lessonFeature(lesson, 'evidence', true);
  const assessmentEnabled = lessonFeature(lesson, 'assessment', true);
  const hasAssessment = assessmentEnabled && (
    groupCriteria(state, lesson).length > 0 ||
    (lessonProgramme(lesson) === 'School Swimming' && lesson.mode !== 'Stages only')
  );
  const lessonNotes = kids.flatMap(learner =>
    (Array.isArray(learner.notes) ? learner.notes : [])
      .map(note => ({ ...note, learnerId: learner.id, learnerName: learner.name }))
  );

  const occurrenceDate = state.activeOccurrenceDate || localDateKey();

  function changeLearner(id, patch) {
    update(current => updateLearnerOccurrence(current, lesson.id, occurrenceDate, id, patch));
  }

  function addNames() {
    const newKids = createLearnersFromText(names, lesson.id, firstStageForGroup(state, lesson.groupTemplateId));
    if (!newKids.length) return;
    update(current => ({
      ...current,
      learners: [...current.learners, ...newKids],
      selected: newKids[0].id
    }));
    setNames('');
  }

  function removeLearner(id) {
    update(current => ({
      ...current,
      learners: current.learners.filter(p => p.id !== id),
      selected: current.selected === id ? '' : current.selected
    }));
  }

  return <>
    <section className='card register-card'>
      <div className='register-head'>
        <div><h2>Register</h2><p className='muted register-date'>{displayOccurrenceDate(occurrenceDate)}</p></div>
        <div className='register-head-actions'>
          {lessonNotes.length > 0 && <button className='lesson-note-alert' onClick={() => setShowAllNotes(value => !value)}><span>📝</span><b>{lessonNotes.length}</b></button>}
          <span className='pill'>{kids.length} child{kids.length === 1 ? '' : 'ren'}</span>
        </div>
      </div>
      {showAllNotes && lessonNotes.length > 0 && <div className='lesson-notes-summary'>
        {kids.filter(learner => Array.isArray(learner.notes) && learner.notes.length > 0).map(learner => <button key={learner.id} onClick={() => { setOpenNotes(learner.id); setShowAllNotes(false); }}>
          <span><strong>{learner.name}</strong><small>{learner.notes.length} note{learner.notes.length === 1 ? '' : 's'}</small></span><b>›</b>
        </button>)}
      </div>}
      <div className='register-list'>
        {kids.map(p => {
          const noteCount = Array.isArray(p.notes) ? p.notes.length : 0;
          const showNoteButton = noteCount > 0 || notesEnabled || evidenceEnabled;
          return <div className='register-person-wrap' key={p.id}>
            <div className='register-person'>
              <div className='register-person-main'>
                <b>{p.name}</b>
                <small>{completionText(state, lesson, p)}</small>
                {lessonStages.length > 1 && (coachOnly
                  ? <span className='learner-stage-pill'>{p.stage || lessonStages[0]}</span>
                  : <select
                      className='learner-stage-select'
                      value={lessonStages.includes(p.stage) ? p.stage : lessonStages[0]}
                      onChange={e => changeLearner(p.id, { stage: e.target.value })}
                      aria-label={`${p.name} stage`}
                    >
                      {lessonStages.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                    </select>)}
              </div>
              {showNoteButton && <button
                className={'learner-note-button ' + (noteCount ? 'has-notes' : '')}
                onClick={() => setOpenNotes(openNotes === p.id ? '' : p.id)}
                aria-label={noteCount ? `${noteCount} notes for ${p.name}` : `Add note for ${p.name}`}
              ><span>📝</span>{noteCount > 0 ? <b>{noteCount}</b> : <b>+</b>}</button>}
              <select className={'attendance-select ' + (p.att === 'Absent' ? 'absent' : '')} value={p.att || 'Present'} onChange={e => changeLearner(p.id, { att: e.target.value })} aria-label={`${p.name} attendance`}>
                {attendanceOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
              {!coachOnly && <button className='register-remove' onClick={() => removeLearner(p.id)}>Remove</button>}
            </div>
            {openNotes === p.id && <>
              <LearnerNotesPanel state={state} update={update} learner={p} canEdit={!coachOnly} onClose={() => setOpenNotes('')} />
              {(notesEnabled || evidenceEnabled) && <section className='register-session-record'>
                <LearnerSessionRecord
                  lesson={lesson}
                  learner={p}
                  note={p.sessionNote || ''}
                  onNote={value => changeLearner(p.id, { sessionNote: value })}
                  allowNotes={notesEnabled}
                  allowEvidence={evidenceEnabled}
                />
              </section>}
            </>}
          </div>;
        })}
      </div>
    </section>
    {!coachOnly && <section className='card'><h2>Add learners</h2><p className='muted'>One name per line.</p><textarea value={names} onChange={e => setNames(e.target.value)} placeholder={'Pippa B\nArchie T\nMia J'} /><button className='btn org' onClick={addNames}>Add names</button></section>}
    <div className='footer'>
      <button className='btn' onClick={() => update(coachOnly ? { step: 'list', active: '' } : { step: 'edit' })}>{coachOnly ? 'Back to today' : 'Back'}</button>
      {staff?.assess === false || !hasAssessment
        ? <button className='btn org' onClick={() => update(current => completeSessionOccurrence(current, lesson, occurrenceDate))}>Save & finish</button>
        : <button className='btn org' onClick={() => update({ step: 'assess', selected: kids.find(p => p.att !== 'Absent')?.id || kids[0]?.id || '', assessmentMode: 'swimmer' })}>Assess</button>}
    </div>
  </>;
}

function Assess({ state, update, lesson }) {
  const kids = state.learners.filter(p => p.lesson === lesson.id && p.att !== 'Absent');
  const selected = kids.find(p => p.id === state.selected) || kids[0];
  const criteria = [...new Set(kids.flatMap(child => learnerCriteria(state, lesson, child)))];
  const selectedCriteria = selected ? learnerCriteria(state, lesson, selected) : [];
  const selectedSkill = criteria.includes(state.selectedSkill) ? state.selectedSkill : criteria[0] || '';
  const relevantKids = selectedSkill ? kids.filter(child => learnerCriteria(state, lesson, child).includes(selectedSkill)) : [];
  const mode = state.assessmentMode || 'swimmer';
  const showNationalCurriculum = lessonFeature(lesson, 'assessment', true) && lessonProgramme(lesson) === 'School Swimming' && lesson.mode !== 'Stages only';
  const scoreOptions = assessmentOptions(state);
  const staff = coachSessionStaff(state);
  const coachOnly = !!staff && staff.role !== 'Admin';
  const occurrenceDate = state.activeOccurrenceDate || localDateKey();
  const [detailView, setDetailView] = useState('list');

  function changeLearner(id, patch) {
    update(current => updateLearnerOccurrence(current, lesson.id, occurrenceDate, id, patch));
  }

  function scoreLearner(learner, criteriaItem, value) {
    if (!criteriaItem || !learner) return;
    changeLearner(learner.id, { res: { ...(learner.res || {}), [criteriaItem]: value } });
  }

  function setDistanceForLearner(learner, stroke, value) {
    changeLearner(learner.id, {
      dist: { ...(learner.dist || {}), [stroke]: value }
    });
  }

  function chooseMode(nextMode) {
    setDetailView('list');
    update({ assessmentMode: nextMode });
  }

  function openChild(child) {
    update({ selected: child.id });
    setDetailView('child');
  }

  function openSkill(skill) {
    update({ selectedSkill: skill });
    setDetailView('skill');
  }

  if (!kids.length) {
    return <><section className='card'><h2>No learners to assess</h2><p className='muted'>Mark learners as present on the register first.</p></section><div className='footer'><button className='btn' onClick={() => update({ step: 'register' })}>Back to register</button></div></>;
  }

  const individualList = mode === 'swimmer' && detailView === 'list';
  const individualDetail = mode === 'swimmer' && detailView === 'child' && selected;
  const groupList = mode === 'skill' && detailView === 'list';
  const groupDetail = mode === 'skill' && detailView === 'skill' && selectedSkill;

  return <>
    <section className='card assessment-choice'>
      <div className='assessment-mode-head'>
        <h2>Assess</h2>
        <div className='assess-mode-grid'>
          {assessmentModes.map(item => <button key={item.id} className={'assess-mode ' + (mode === item.id ? 'on' : '')} onClick={() => chooseMode(item.id)}><strong>{item.title}</strong></button>)}
        </div>
      </div>
    </section>

    {individualList && <section className='card assessment-picker'>
      <div className='assessment-picker-head'><h2>Choose a child</h2><span className='pill'>{kids.length} child{kids.length === 1 ? '' : 'ren'}</span></div>
      <div className='assessment-list'>
        {kids.map(child => {
          const childCriteria = learnerCriteria(state, lesson, child);
          const marked = childCriteria.filter(skill => isMarkedAssessment(child.res?.[skill])).length;
          const progressClass = marked && marked === childCriteria.length ? ' all-marked' : marked ? ' started' : '';
          return <button className={'assessment-list-button' + progressClass} key={child.id} onClick={() => openChild(child)}>
            <span><strong>{child.name}</strong><small>{childAssessmentSummary(childCriteria, child, lesson)}{groupStages(state, lesson).length > 1 && child.stage ? ` · ${child.stage}` : ''}</small></span>
            <b>›</b>
          </button>;
        })}
      </div>
    </section>}

    {individualDetail && <section className='card assessment-card'>
      <button className='assessment-back' onClick={() => setDetailView('list')}>‹ Back to children</button>
      <div className='assessment-head'><div><h2>{selected.name}</h2><p className='muted'>{childAssessmentSummary(selectedCriteria, selected, lesson)}{groupStages(state, lesson).length > 1 && selected.stage ? ` · ${selected.stage}` : ''}</p></div></div>
      {lesson.mode !== 'National Curriculum only' && <>
        <div className='grid2'><Distance label='Distance front' value={selected.dist?.front || '0m'} onChange={v => setDistanceForLearner(selected, 'front', v)} /><Distance label='Distance back' value={selected.dist?.back || '0m'} onChange={v => setDistanceForLearner(selected, 'back', v)} /></div>
        <p className='muted'>Distance is recorded separately. Mark technique and skill criteria explicitly.</p>
        {selectedCriteria.map(skill => <SkillScore key={skill} criteria={skill} value={selected.res?.[skill]} options={scoreOptions} onScore={v => scoreLearner(selected, skill, v)} />)}
      </>}
      {showNationalCurriculum && <>
        <h3>National Curriculum</h3>
        {nationalCurriculum.map(item => <label className='pill' key={item}><input type='checkbox' checked={!!selected.nc?.[item]} onChange={e => changeLearner(selected.id, { nc: { ...(selected.nc || {}), [item]: e.target.checked } })} /> {item}</label>)}
      </>}
      {(lessonFeature(lesson, 'notes', true) || lessonFeature(lesson, 'evidence', true)) && <LearnerSessionRecord
        lesson={lesson}
        learner={selected}
        note={selected.sessionNote || ''}
        onNote={value => changeLearner(selected.id, { sessionNote: value })}
        allowNotes={lessonFeature(lesson, 'notes', true)}
        allowEvidence={lessonFeature(lesson, 'evidence', true)}
      />}
    </section>}

    {groupList && <section className='card assessment-picker'>
      <div className='assessment-picker-head'><h2>Choose a skill</h2><span className='pill'>{criteria.length} skill{criteria.length === 1 ? '' : 's'}</span></div>
      {criteria.length ? <div className='assessment-list'>
        {criteria.map(skill => {
          const applicable = kids.filter(child => learnerCriteria(state, lesson, child).includes(skill));
          const assessed = applicable.filter(child => isMarkedAssessment(child.res?.[skill])).length;
          const progressClass = assessed && assessed === applicable.length ? ' all-marked' : assessed ? ' started' : '';
          return <button className={'assessment-list-button' + progressClass} key={skill} onClick={() => openSkill(skill)}>
            <span><strong>{skill}</strong><small>{assessed ? `${assessed}/${applicable.length} marked` : `${applicable.length} relevant learner${applicable.length === 1 ? '' : 's'}`}</small></span>
            <b>›</b>
          </button>;
        })}
      </div> : <p className='muted'>This session has no group skills to assess.</p>}
    </section>}

    {groupDetail && <section className='card skill-assessment'>
      <button className='assessment-back' onClick={() => setDetailView('list')}>‹ Back to skills</button>
      <div className='assessment-head'><div><h2>{selectedSkill}</h2><p className='muted'>{relevantKids.length} relevant learner{relevantKids.length === 1 ? '' : 's'}</p></div></div>
      <div className='skill-list'>
        {relevantKids.map(child => <div className='skill-row' key={child.id}>
          <div><h3>{child.name}</h3></div>
          <div className='score-buttons'>{scoreOptions.map((option, index) => <button className={'score-btn ' + (resultMatchesOption(child.res?.[selectedSkill], option, index, scoreOptions) ? 'on' : '')} key={option.value} onClick={() => scoreLearner(child, selectedSkill, option.value)}>{option.label}</button>)}</div>
        </div>)}
      </div>
    </section>}

    <div className='footer'>
      <button className='btn' onClick={() => update({ step: 'register' })}>Back</button>
      {coachOnly ? <button className='btn org' onClick={() => update(current => completeSessionOccurrence(current, lesson, occurrenceDate))}>Save & finish</button> : <button className='btn org' onClick={() => update({ step: 'save' })}>Save session</button>}
    </div>
  </>;
}

function LearnerSessionRecord({ lesson, learner, note, onNote, allowNotes = true, allowEvidence = true }) {
  const cloudAccount = isCloudAccountSession();
  const [evidence, setEvidence] = useState([]);
  const [evidenceError, setEvidenceError] = useState('');
  const [loadingEvidence, setLoadingEvidence] = useState(true);

  async function refreshEvidence() {
    setLoadingEvidence(true);
    setEvidenceError('');
    try {
      const records = await listLocalEvidence(lesson.id, learner.id);
      setEvidence(records.map(record => ({ ...record, url: URL.createObjectURL(record.blob) })));
    } catch (error) {
      setEvidenceError(error?.message || 'Could not load local evidence');
    } finally {
      setLoadingEvidence(false);
    }
  }

  useEffect(() => {
    let active = true;
    if (cloudAccount || !allowEvidence) {
      setEvidence([]);
      setEvidenceError('');
      setLoadingEvidence(false);
      return () => { active = false; };
    }
    setLoadingEvidence(true);
    setEvidenceError('');
    listLocalEvidence(lesson.id, learner.id)
      .then(records => {
        if (!active) return;
        setEvidence(records.map(record => ({ ...record, url: URL.createObjectURL(record.blob) })));
      })
      .catch(error => {
        if (active) setEvidenceError(error?.message || 'Could not load local evidence');
      })
      .finally(() => {
        if (active) setLoadingEvidence(false);
      });
    return () => {
      active = false;
    };
  }, [lesson.id, learner.id, cloudAccount, allowEvidence]);

  async function addEvidence(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setEvidenceError('');
    try {
      for (const file of files) await saveLocalEvidence(file, lesson.id, learner.id);
      await refreshEvidence();
    } catch (error) {
      setEvidenceError(error?.message || 'Could not save that file');
    } finally {
      event.target.value = '';
    }
  }

  async function removeEvidence(item) {
    try {
      await deleteLocalEvidence(item.id);
      if (item.url) URL.revokeObjectURL(item.url);
      setEvidence(current => current.filter(record => record.id !== item.id));
    } catch (error) {
      setEvidenceError(error?.message || 'Could not remove that file');
    }
  }

  return <section className='learner-session-record'>
    <div className='session-record-head'>
      <div><h3>{allowNotes && allowEvidence ? 'Session notes & evidence' : allowNotes ? 'Session notes' : 'Session evidence'}</h3><p className='muted'>Saved to {learner.name} for this session.</p></div>
    </div>
    {allowNotes && <textarea
      className='session-note'
      value={note}
      onChange={event => onNote(event.target.value)}
      placeholder='Add a quick note about progress, support, confidence or what to try next…'
    />}
    {allowEvidence && (cloudAccount
      ? <p className='evidence-cloud-pending'>Photo/video evidence is temporarily disabled for real accounts until secure organisation storage is connected.</p>
      : <div className='evidence-actions'>
          <label className='btn evidence-upload'>
            Add photo / video
            <input type='file' accept='image/*,video/*' multiple onChange={addEvidence} />
          </label>
          <span>Stored on this device only</span>
        </div>)}
    {!allowEvidence && <p className='muted'>Photo/video evidence is switched off for this session.</p>}
    {allowEvidence && !cloudAccount && evidenceError && <p className='evidence-error'>{evidenceError}</p>}
    {allowEvidence && !cloudAccount && (loadingEvidence ? <p className='muted'>Loading evidence…</p> : evidence.length > 0 && <div className='evidence-grid'>
      {evidence.map(item => <article className='evidence-item' key={item.id}>
        {String(item.type).startsWith('video/')
          ? <video src={item.url} controls preload='metadata' />
          : <img src={item.url} alt={item.name || 'Session evidence'} />}
        <div><span>{item.name}</span><button onClick={() => removeEvidence(item)}>Remove</button></div>
      </article>)}
    </div>)}
    <p className='evidence-safety'>{cloudAccount ? 'Session notes sync with the organisation workspace. Media stays disabled until secure cloud storage and retention controls are ready.' : 'Demo/local evidence only — use example children, not real pupil photos or videos yet.'}</p>
  </section>;
}

function SkillScore({ criteria, value, options, onScore }) {
  return <div className='criteria skill-card'><b>{criteria}</b><div className='score-buttons'>{options.map((option, index) => <button className={'score-btn ' + (resultMatchesOption(value, option, index, options) ? 'on' : '')} key={option.value} onClick={() => onScore(option.value)}>{option.label}</button>)}</div></div>;
}

function SaveLesson({ state, update, lesson }) {
  const occurrenceDate = state.activeOccurrenceDate || localDateKey();
  const kids = state.learners.filter(p => p.lesson === lesson.id);
  const present = kids.filter(p => p.att !== 'Absent');
  const criteria = groupCriteria(state, lesson);
  const complete = present.filter(p => criteria.length && criteria.every(c => p.res?.[c] === 'pass'));
  return <>
    <section className='card'><h2>Session saved</h2><p className='muted'>{lesson.name}</p><div className='grid stat-grid'><div className='card stat-card'><h2>{present.length}</h2><p className='muted'>Present</p></div><div className='card stat-card'><h2>{complete.length}</h2><p className='muted'>Completed criteria</p></div><div className='card stat-card'><h2>{criteria.length}</h2><p className='muted'>Criteria assessed</p></div></div></section>
    <section className='card'><h2>Session summary</h2>{present.map(p => <div className='folder' key={p.id}>{p.name}: {completionText(state, lesson, p)}</div>)}</section>
    <div className='footer'><button className='btn' onClick={() => update({ step: 'assess' })}>Back to assessment</button><button className='btn org' onClick={() => update(current => completeSessionOccurrence(current, lesson, occurrenceDate))}>Finish</button></div>
  </>;
}

function HealthCheck({ state, update }) {
  const cloudAccount = isCloudAccountSession();
  const items = useMemo(() => getHealthItems(state), [state]);
  const done = items.filter(item => item.done).length;
  const failed = items.filter(item => !item.done);
  const percent = Math.round((done / items.length) * 100);
  const testSteps = ['Open Home', 'Open Timetable', 'Create or edit a class/session', 'Choose a criteria group', 'Paste learners', 'Complete register', 'Assess by name', 'Assess by skill', 'Save session', 'Open Reports', 'Open Settings'];
  return <><section className='hero'><p>Priority 1</p><h1>Stability health check</h1><p>{percent}% of automatic checks are passing.</p></section><div className='grid'><div className='card'><h2>{percent}%</h2><p className='muted'>Automatic stability score</p></div><div className='card'><h2>{done}/{items.length}</h2><p className='muted'>Checks passing</p></div><div className='card'><h2>{state.audit?.length || 0}</h2><p className='muted'>Audit entries</p></div></div><section className='card'><h2>{failed.length ? 'Needs checks' : 'Ready for manual sign-off'}</h2><p className='muted'>{failed.length ? 'Fix the warnings below before moving on.' : 'Run the manual test route once on your phone.'}</p></section><section className='card'><h2>✅ Passed</h2>{items.filter(item => item.done).map(item => <div className='folder' key={item.label}>✅ {item.label}<p className='muted'>{item.detail}</p></div>)}</section><section className='card'><h2>⚠️ Needs fixing</h2>{failed.length ? failed.map(item => <div className='folder' key={item.label}>⚠️ {item.label}<p className='muted'>{item.detail}</p></div>) : <div className='folder'>✅ Nothing currently flagged.</div>}</section><section className='card'><h2>Manual live test route</h2>{testSteps.map((step, index) => <div className='folder' key={step}>#{index + 1} {step}</div>)}</section><div className='footer'>{cloudAccount
  ? <button className='btn' onClick={() => location.reload()}>Reload cloud workspace</button>
  : <button className='btn' onClick={() => {
      if (!window.confirm('Reset Stage Flow demo data on this device? This clears your local test changes.')) return;
      clearAppState();
      location.reload();
    }}>Reset demo data</button>}
  <button className='btn org' onClick={() => update({ screen: 'timetable', step: 'list' })}>Test timetable</button>
</div></>;
}
function getHealthItems(state) {
  const activeExists = !state.active || state.lessons.some(l => l.id === state.active);
  const everyLessonHasGroup = state.lessons.every(l => !!l.groupTemplateId);
  const currentProgrammeNames = state.lessons.every(l => !['Evening Swim Lessons', 'Group Lessons', '1:1 Lessons'].includes(l.programme));
  return [
    { label: 'App state loads', done: !!state && typeof state === 'object', detail: 'React has loaded a usable state object.' },
    { label: 'Lessons are available', done: Array.isArray(state.lessons), detail: `${state.lessons?.length || 0} class/session item(s) loaded.` },
    { label: 'Lessons use criteria groups', done: everyLessonHasGroup, detail: 'Every class/session has a criteria group.' },
    { label: 'Programme names are current', done: currentProgrammeNames, detail: 'Old Evening Swim Lessons / 1:1 labels are not being used by core state.' },
    { label: 'Criteria groups exist', done: groups(state).length > 0, detail: `${groups(state).length} criteria group(s) available.` },
    { label: 'Criteria can be calculated', done: state.lessons.every(l => l.mode === 'National Curriculum only' || groupCriteria(state, l).length > 0), detail: 'Class/session criteria comes from the selected group.' },
    { label: 'Learner data is safe', done: Array.isArray(state.learners) && state.learners.every(p => p.id && p.name && p.lesson && p.att), detail: `${state.learners?.length || 0} learner(s) loaded.` },
    { label: 'Active session is valid', done: activeExists, detail: activeExists ? 'The selected session exists or none is selected.' : 'Selected session is missing.' },
    { label: 'Assessment mode is valid', done: ['swimmer', 'skill'].includes(state.assessmentMode || 'swimmer'), detail: `Assessment mode is ${state.assessmentMode || 'swimmer'}.` },
    { label: 'National Curriculum items exist', done: nationalCurriculum.length >= 4, detail: `${nationalCurriculum.length} NC item(s) available.` },
    { label: 'Reports pack state exists', done: !!state.pack && typeof state.pack === 'object', detail: 'End-of-term pack settings are present.' },
    { label: 'Settings data exists', done: Array.isArray(state.staff) && Array.isArray(state.certificates), detail: 'Staff permissions and certificate template data are present.' },
    { label: 'Audit log exists', done: Array.isArray(state.audit), detail: `${state.audit?.length || 0} audit item(s) saved.` }
  ];
}

function Reports({ state, update }) {
  const lessons = state.lessons.map(lesson => {
    const swimmers = state.learners.filter(p => p.lesson === lesson.id);
    const criteria = groupCriteria(state, lesson);
    const complete = swimmers.filter(p => {
      const applicable = learnerCriteria(state, lesson, p);
      return applicable.length > 0 && applicable.every(c => p.res?.[c] === 'pass');
    }).length;
    return { lesson, swimmers, criteria, complete };
  });
  return <><section className='hero compact-hero'><h1>Progress</h1></section><div className='grid2'>{lessons.map(({ lesson, swimmers, criteria, complete }) => <section className='card' key={lesson.id}><h2>{lesson.name}</h2><p className='muted'>{lessonProgramme(lesson)} · {groupLabel(state, lesson)}</p><span className='pill'>{swimmers.length} learners</span><span className='pill'>{criteria.length} criteria</span><span className='pill'>{complete} complete</span>{swimmers.map(p => <div className='folder' key={p.id}>{p.name}: {completionText(state, lesson, p)}</div>)}</section>)}</div><section className='card'><h2>End-of-term pack</h2><p className='muted'>This will later become the printable/export pack. For now, it is showing live progress from criteria groups.</p><button className='btn org' onClick={() => update({ audit: [`Progress pack checked`, ...(state.audit || [])] })}>Log pack check</button></section></>;
}

function Settings({ state, update }) {
  const staff = coachSessionStaff(state);
  const tabs = [
    ...(staff?.groups === false ? [] : ['groups']),
    ...(staff?.framework === false ? [] : ['framework']),
    ...(staff?.certificates === false ? [] : ['certificates']),
    'permissions',
    'audit'
  ];
  const activeTab = tabs.includes(state.tab) ? state.tab : tabs[0] || 'audit';
  return <><section className='hero compact-hero'><h1>Settings</h1></section><div className='tabs'>{tabs.map(t => <button key={t} className={activeTab === t ? 'on' : ''} onClick={() => update({ tab: t })}>{t === 'groups' ? 'criteria groups' : t}</button>)}</div>{activeTab === 'groups' && <Groups state={state} update={update} />}{activeTab === 'framework' && <Framework state={state} update={update} />}{activeTab === 'certificates' && <Certificates state={state} update={update} />}{activeTab === 'permissions' && <Permissions state={state} update={update} />}{activeTab === 'audit' && <section className='card'><h2>Audit log</h2>{(state.audit || []).map((a, i) => <p key={i}>• {a}</p>)}</section>}</>;
}

function Groups({ state, update }) {
  function edit(i, key, value) {
    const groupTemplates = [...groups(state)];
    let nextGroup = { ...groupTemplates[i], [key]: value };
    if (key === 'programme') {
      const allowedStages = criteriaStagesForProgramme(value, state.framework.stages || []);
      nextGroup = { ...nextGroup, programme: normaliseProgrammeName(value), stages: (nextGroup.stages || []).filter(stage => allowedStages.includes(stage)) };
    }
    groupTemplates[i] = nextGroup;
    update({ framework: { ...state.framework, groupTemplates, groups: groupTemplates.map(g => `${g.name}: ${g.detail || ''}`) } });
  }
  function addGroup() {
    const groupTemplates = [...groups(state), { id: 'g' + Date.now(), name: 'New Criteria Group', detail: 'Choose programme and criteria sections', programme: 'School Swimming', stages: [], colour: 'blue' }];
    update({ framework: { ...state.framework, groupTemplates, groups: groupTemplates.map(g => `${g.name}: ${g.detail || ''}`) } });
  }
  return <section className='card'><h2>Criteria groups</h2><p className='muted'>These decide what criteria appears in classes and sessions. Pick a programme so the stage list stays relevant.</p><button className='btn org' onClick={addGroup}>+ Add criteria group</button>{groups(state).map((g, i) => {
    const groupProgramme = programmeForGroup(g);
    const stageOptions = criteriaStagesForProgramme(groupProgramme, state.framework.stages || []);
    return <div className='card' key={g.id}><Field label='Group name' value={g.name} onChange={v => edit(i, 'name', v)} /><Select label='Programme' value={groupProgramme} onChange={v => edit(i, 'programme', v)} options={programmes.map(x => ({ value: x, label: x }))} /><Field label='Group detail' value={g.detail || ''} onChange={v => edit(i, 'detail', v)} /><h3>Criteria sections included</h3><div>{stageOptions.map(stage => <label className='pill' key={stage}><input type='checkbox' checked={g.stages?.includes(stage)} onChange={e => { const next = e.target.checked ? [...(g.stages || []), stage] : (g.stages || []).filter(x => x !== stage); edit(i, 'stages', next); }} /> {stage}</label>)}</div><p className='muted'>{(g.stages || []).flatMap(stage => criteriaForStage(state, stage)).length} criteria in this group.</p></div>;
  })}</section>;
}
function CriteriaSectionEditor({ stage, items, onSave }) {
  const value = (items || []).join('\n');
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [stage, value]);

  const lines = draft.split('\n').map(line => line.trim()).filter(Boolean);
  const dirty = draft !== value;

  return <section className='card admin-editor-card'>
    <div className='admin-editor-head'>
      <div><h3>{stage} Criteria</h3><p className='muted'>{lines.length} item{lines.length === 1 ? '' : 's'} · one criterion per line</p></div>
      {dirty && <span className='pill'>Unsaved</span>}
    </div>
    <textarea
      className='admin-big-textarea'
      rows={Math.max(7, Math.min(14, lines.length + 3))}
      value={draft}
      onChange={event => setDraft(event.target.value)}
      placeholder={'Enter the water safely\nBlow bubbles\nFloat on front\nClimb out safely'}
    />
    <div className='admin-editor-actions'>
      <span className='muted'>Press Enter for a new criterion.</span>
      <button className='btn org' disabled={!dirty} onClick={() => onSave(lines)}>Save criteria</button>
    </div>
  </section>;
}

function PassMarksEditor({ marks, onSave }) {
  const value = (marks || []).join('\n');
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const lines = draft.split('\n').map(line => line.trim()).filter(Boolean);
  const dirty = draft !== value;

  function save() {
    if (lines.length < 2) {
      setError('Add at least two levels: a lowest result and a passed result.');
      return;
    }
    setError('');
    onSave(lines);
  }

  return <section className='card admin-editor-card pass-mark-editor'>
    <div className='admin-editor-head'>
      <div><h3>Assessment marks</h3><p className='muted'>Top line = lowest result · bottom line = achieved/passed</p></div>
      {dirty && <span className='pill'>Unsaved</span>}
    </div>
    <textarea
      className='admin-big-textarea pass-mark-textarea'
      rows={6}
      value={draft}
      onChange={event => { setDraft(event.target.value); setError(''); }}
      placeholder={'Needs practice\nClose\nAlmost there\nPassed'}
    />
    {lines.length > 0 && <div className='pass-mark-preview'>
      {lines.map((label, index) => <span className={'pass-mark-chip ' + (index === lines.length - 1 ? 'passed' : '')} key={index}>{label}</span>)}
    </div>}
    {error && <p className='admin-editor-error'>{error}</p>}
    <div className='admin-editor-actions'>
      <span className='muted'>Each line becomes one assessment button.</span>
      <button className='btn org' disabled={!dirty} onClick={save}>Save marks</button>
    </div>
  </section>;
}

function Framework({ state, update }) {
  function saveCriteria(stage, items) {
    update({
      framework: {
        ...state.framework,
        criteria: { ...state.framework.criteria, [stage]: items }
      },
      audit: [...(state.audit || []), `Updated ${stage} criteria`]
    });
  }

  function savePassMarks(passMarks) {
    update({
      framework: { ...state.framework, passMarks },
      audit: [...(state.audit || []), 'Updated assessment marks']
    });
  }

  function addStage() {
    const nextNumber = state.framework.stages.length + 1;
    const name = window.prompt('Name this criteria section', `New Criteria Section ${nextNumber}`);
    const clean = String(name || '').trim();
    if (!clean || state.framework.stages.includes(clean)) return;
    update({
      framework: {
        ...state.framework,
        stages: [...state.framework.stages, clean],
        criteria: { ...state.framework.criteria, [clean]: [] }
      }
    });
  }

  const passMarks = Array.isArray(state.framework.passMarks) && state.framework.passMarks.length >= 2
    ? state.framework.passMarks
    : ['Needs practice', 'Almost there', 'Passed'];

  return <section className='card admin-framework'>
    <div className='admin-framework-head'>
      <div><h2>Criteria & assessment</h2><p className='muted'>Simple line-by-line editing for what coaches assess.</p></div>
      <button className='btn org' onClick={addStage}>+ Add section</button>
    </div>
    <PassMarksEditor marks={passMarks} onSave={savePassMarks} />
    <div className='admin-section-divider'><h2>Criteria sections</h2><p className='muted'>Each non-empty line is saved as one criterion.</p></div>
    <div className='admin-criteria-list'>
      {state.framework.stages.map(stage => <CriteriaSectionEditor key={stage} stage={stage} items={state.framework.criteria?.[stage] || []} onSave={items => saveCriteria(stage, items)} />)}
    </div>
  </section>;
}

function Certificates({ state, update }) {
  function addCert() {
    update({ certificates: [...state.certificates, { id: 'cert' + Date.now(), name: 'New Certificate Template', rule: 'Criteria group complete', font: 'Serif', size: 32, groupBy: 'Criteria group' }] });
  }
  return <section className='card'><h2>Certificate templates</h2><p className='muted'>Certificate generation is still demo-level, but it now points at criteria completion rather than initial placement.</p><button className='btn org' onClick={addCert}>+ Add certificate template</button>{state.certificates.map(c => <div className='card' key={c.id}><Field label='Name' value={c.name} onChange={v => update({ certificates: state.certificates.map(x => x.id === c.id ? { ...x, name: v } : x) })} /><Select label='Rule' value={c.rule} onChange={v => update({ certificates: state.certificates.map(x => x.id === c.id ? { ...x, rule: v } : x) })} options={['Criteria group complete', 'National Curriculum achieved', 'Selected award only'].map(x => ({ value: x, label: x }))} /><Select label='Group by' value={c.groupBy} onChange={v => update({ certificates: state.certificates.map(x => x.id === c.id ? { ...x, groupBy: v } : x) })} options={['Criteria group', 'School / venue', 'Award', 'All in one PDF'].map(x => ({ value: x, label: x }))} /></div>)}</section>;
}
function Permissions({ state, update }) {
  const cloudAccount = isCloudAccountSession();

  function patchStaff(id, patch) {
    update({ staff: state.staff.map(person => person.id === id ? { ...person, ...patch } : person) });
  }

  function generateCode(id) {
    const used = new Set(state.staff.filter(person => person.id !== id).map(person => String(person.accessCode || '')));
    let code = '';
    for (let attempt = 0; attempt < 50; attempt += 1) {
      code = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
      if (!used.has(code)) break;
    }
    patchStaff(id, { accessCode: code });
  }

  return <>
  {cloudAccount && <StaffAccountsPanel onStaffChanged={cloudStaff => update({ staff: cloudStaff })} />}
  {!cloudAccount && <section className='card'>
    <h2>Quick access codes</h2>
    <p className='muted'>Optional demo/poolside codes. Real account access uses the email login above.</p>
    <div className='staff-access-list'>
      {state.staff.map(staff => {
        const code = String(staff.accessCode || '');
        const duplicate = code.length === 5 && state.staff.some(person => person.id !== staff.id && String(person.accessCode || '') === code);
        return <div className={'card staff-access-card' + (duplicate ? ' code-warning' : '')} key={staff.id}>
        <div className='staff-access-head'><div><h3>{staff.name}</h3><p className='muted'>{staff.role}</p></div>{duplicate && <span className='pill warning-pill'>Duplicate code</span>}</div>
        <div className='staff-code-row'>
          <label>5-digit coach code</label>
          <div>
            <input
              className='staff-code-input'
              inputMode='numeric'
              pattern='[0-9]*'
              maxLength={5}
              value={staff.accessCode || ''}
              onChange={e => patchStaff(staff.id, { accessCode: e.target.value.replace(/\D/g, '').slice(0, 5) })}
              aria-label={`${staff.name} access code`}
            />
            <button className='btn' onClick={() => generateCode(staff.id)}>New code</button>
          </div>
        </div>
        <div className='staff-permission-list'>
          {['sessions', 'groups', 'learners', 'assess', 'export', 'framework', 'certificates'].map(key => <label className='pill' key={key}><input type='checkbox' checked={!!staff[key]} onChange={e => patchStaff(staff.id, { [key]: e.target.checked })} /> {key}</label>)}
        </div>
      </div>;
      })}
    </div>
    <p className='muted staff-code-note'>Quick codes are a convenience layer only. Email/password accounts are the real staff identity.</p>
  </section>}
  </>;
}

function Field({ label, value, onChange, placeholder = '' }) {
  return <div className='field'><label>{label}</label><input value={value || ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} /></div>;
}
function Select({ label, value, onChange, options }) {
  return <div className='field'><label>{label}</label><select value={value || ''} onChange={e => onChange(e.target.value)}>{options.map(option => typeof option === 'string' ? <option key={option} value={option}>{option}</option> : <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>;
}
function Distance({ label, value, onChange }) {
  return <Select label={label} value={value || '0m'} onChange={onChange} options={distances.map(x => ({ value: x, label: x }))} />;
}

createRoot(document.getElementById('root')).render(
  <StageFlowErrorBoundary>
    <StageFlowAccountGate>
      {({ accountMode, signOut, staff }) => <App accountMode={accountMode} accountStaff={staff} onAccountSignOut={signOut} />}
    </StageFlowAccountGate>
  </StageFlowErrorBoundary>
);
