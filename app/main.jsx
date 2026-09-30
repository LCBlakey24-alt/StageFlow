import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';
import './styles/calendar-overlay.css';
import { demoFramework, demoLearners, demoLessons, nationalCurriculum, stageCriteria, programmeAreas } from './data/demoData.js';
import { loadAppState, saveAppState, clearAppState } from './lib/localStore.js';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const COACH_SESSION_KEY = 'stageflow-coach-session';

function todayWeekday() {
  const index = new Date().getDay();
  return index >= 1 && index <= 5 ? days[index - 1] : days[0];
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

function coachSessionStaff(state) {
  const id = readCoachSessionStaffId();
  return (state.staff || []).find(staff => staff.id === id) || null;
}
const durations = [15, 30, 45, 60, 75, 90, 105, 120];
const modes = ['Stages + National Curriculum', 'National Curriculum only'];
const attendanceOptions = ['Present', 'Absent', 'Late', 'Not Taking Part'];
const scores = ['no', 'float', 'pass'];
const scoreLabels = { no: 'Not assessed', float: 'Almost there', pass: 'Passed' };
const scoreButtonLabels = { no: 'Not assessed', float: 'Almost', pass: 'Passed' };
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
  active: 'l1',
  draft: null,
  currentDay: 'Tuesday',
  timetableFilter: 'All',
  lessons: demoLessons.map(l => ({ day: 'Tuesday', duration: 30, className: '', coach: '', groupTemplateId: defaultGroupForProgramme(l.programme || demoFramework.area || 'School Swimming', demoFramework.groupTemplates), programme: normaliseProgrammeName(l.programme || demoFramework.area || 'School Swimming'), ...l, programme: normaliseProgrammeName(l.programme || demoFramework.area || 'School Swimming') })),
  learners: demoLearners,
  framework: demoFramework,
  certificates: [
    { id: 'cert1', name: 'Highest Stage Certificate', rule: 'Highest achieved stage', font: 'Serif', size: 34, groupBy: 'Year group' },
    { id: 'cert2', name: 'National Curriculum Certificate', rule: 'National Curriculum achieved', font: 'Sans Serif', size: 28, groupBy: 'Award' }
  ],
  staff: [
    { id: 's1', name: 'Lewis', role: 'Lead Coach', accessCode: '13579', sessions: true, groups: true, learners: true, assess: true, export: false, framework: false, certificates: false },
    { id: 's2', name: 'Sarah', role: 'Coach', accessCode: '24680', sessions: true, groups: false, learners: true, assess: true, export: false, framework: false, certificates: false },
    { id: 's3', name: 'Admin User', role: 'Admin', accessCode: '80421', sessions: true, groups: true, learners: true, assess: true, export: true, framework: true, certificates: true }
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
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}
function addMinutes(time, minutes) { return formatTime(timeToMinutes(time) + (Number(minutes) || 0)); }
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
function groupCriteria(state, lesson) {
  if (!lesson || lesson.mode === 'National Curriculum only') return [];
  const stages = groupStages(state, lesson);
  return [...new Set(stages.flatMap(stage => criteriaForStage(state, stage)))];
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
function distanceNumber(value) { return parseInt(String(value || '0').replace('m', ''), 10) || 0; }
function allCriteria(state) { return Object.values(state.framework?.criteria || stageCriteria || {}).flat(); }
function criteriaDistanceMatch(criteria, stroke, metres) {
  const text = String(criteria || '').toLowerCase();
  const match = text.match(/(\d+)\s*m/);
  if (!match) return false;
  const required = Number(match[1]);
  if (required > metres) return false;
  const frontLike = text.includes('front') || text.includes('crawl');
  const backLike = text.includes('back') || text.includes('backstroke');
  const anyStroke = text.includes('choice of stroke') || text.includes('optional') || text.includes('distance achieved');
  return stroke === 'front' ? frontLike || anyStroke : backLike || anyStroke;
}
function applyDistanceAutoPass(state, currentResults, stroke, metres) {
  const next = { ...(currentResults || {}) };
  allCriteria(state).forEach(criteria => {
    if (criteriaDistanceMatch(criteria, stroke, metres)) next[criteria] = 'pass';
  });
  return next;
}
function completionText(state, lesson, learner) {
  const criteria = groupCriteria(state, lesson);
  if (!criteria.length) return 'NC only';
  const passed = criteria.filter(c => learner?.res?.[c] === 'pass').length;
  return `${passed}/${criteria.length} criteria passed`;
}

function isMarkedAssessment(value) {
  return value === 'float' || value === 'pass';
}

function childAssessmentSummary(criteria, learner) {
  if (!criteria.length) return 'National Curriculum only';
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
    nc: {}
  }));
}

function App() {
  const [state, setState] = useState(() => loadAppState(starter));
  const [hydroStatus, setHydroStatus] = useState('idle');

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
    const newState = typeof next === 'function' ? next(state) : { ...state, ...next };
    setState(newState);
    saveAppState(newState);
  }
  const lesson = state.lessons.find(l => l.id === state.active);
  const activeStaff = coachSessionStaff(state);
  const coachOnly = !!activeStaff && activeStaff.role !== 'Admin';
  const screens = coachOnly ? ['home', 'timetable'] : ['home', 'timetable', 'health', 'reports', 'settings'];
  return <>
    <div className='top'>
      <div className='brand'>Stage Flow</div>
      {activeStaff?.role === 'Admin' ? <button className='btn' onClick={() => { clearAppState(); location.reload(); }}>Reset</button> : coachOnly ? <button className='btn' onClick={() => { clearCoachSessionStaffId(); location.reload(); }}>Lock</button> : null}
    </div>
    <div className='wrap'>
      <nav className={'rail ' + (coachOnly ? 'coach-rail' : '')}>{screens.map(screen => <button key={screen} className={state.screen === screen ? 'on' : ''} onClick={() => update({ screen, step: 'list' })}>{screen[0].toUpperCase()}</button>)}</nav>
      <main>
        {state.screen === 'home' && (coachOnly ? <CoachHome state={state} update={update} staff={activeStaff} /> : <Home state={state} update={update} hydroStatus={hydroStatus} enableHydrotherapy={enableHydrotherapy} />)}
        {state.screen === 'timetable' && state.step === 'list' && <Timetable state={state} update={update} />}
        {state.screen === 'timetable' && state.step !== 'list' && (lesson ? <Lesson state={state} update={update} lesson={lesson} /> : <MissingLesson update={update} />)}
        {state.screen === 'health' && <HealthCheck state={state} update={update} />}
        {state.screen === 'reports' && <Reports state={state} update={update} />}
        {state.screen === 'settings' && <Settings state={state} update={update} />}
      </main>
    </div>
  </>;
}

function MissingLesson({ update }) {
  return <section className='card'><h2>Class/session not found</h2><p className='muted'>That class may have been deleted or old saved data pointed to a missing session.</p><button className='btn org' onClick={() => update({ screen: 'timetable', step: 'list', active: '' })}>Back to timetable</button></section>;
}

function Home({ state, update, hydroStatus, enableHydrotherapy }) {
  const day = state.currentDay || 'Tuesday';
  const next = state.lessons.find(l => lessonDay(l) === day) || state.lessons[0];
  const ncDone = state.learners.filter(p => nationalCurriculum.every(item => p.nc?.[item])).length;
  return <>
    <section className='hero stage-hero'><h1>Teach. Track. Progress.</h1></section>
    <section className='quick-actions'>
      <button className='action-card primary-action' onClick={() => update({ screen: 'timetable', step: 'list' })}><span>Start Assessment</span></button>
      <button className='action-card' onClick={() => update({ screen: 'timetable', step: 'list' })}><span>My Timetable</span></button>
      <button className='action-card' onClick={() => update({ screen: 'settings', tab: 'groups' })}><span>Criteria Groups</span></button>
      <button className='action-card' onClick={() => update({ screen: 'reports' })}><span>Progress</span></button>
    </section>
    {next ? <section className='card lesson next-lesson'><div className='time'>{next.time}</div><div><h2>{next.name}</h2><p className='muted'>{lessonDay(next)} · {next.school}</p></div><button className='btn org' onClick={() => update({ screen: 'timetable', active: next.id, step: 'register' })}>Open register</button></section> : <section className='card'><h2>No classes yet</h2><button className='btn org' onClick={() => update({ screen: 'timetable', step: 'list' })}>Open timetable</button></section>}
    <div className='grid stat-grid'><div className='card stat-card'><h2>{state.lessons.length}</h2><p className='muted'>Sessions</p></div><div className='card stat-card'><h2>{state.learners.length}</h2><p className='muted'>Learners</p></div><div className='card stat-card'><h2>{ncDone}</h2><p className='muted'>NC achieved</p></div></div>
    <section className='card hydro-home-card'>
      <h2>SEN Hydrotherapy <span className='pill'>Demo</span></h2>
      <button className='btn org' disabled={hydroStatus === 'loading' || hydroStatus === 'enabled'} onClick={enableHydrotherapy}>
        {hydroStatus === 'loading' ? 'Loading…' : hydroStatus === 'enabled' ? 'Hydrotherapy loaded' : hydroStatus === 'error' ? 'Try again' : 'Load hydrotherapy'}
      </button>
      <p className='muted' style={{ marginTop: 8 }}>Demo only — don’t use real pupil data yet.</p>
    </section>
  </>;
}
function CoachHome({ state, update, staff }) {
  const day = todayWeekday();
  const lessons = [...state.lessons]
    .filter(lesson => lessonDay(lesson) === day && lesson.coach === staff.name)
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  return <>
    <section className='hero stage-hero coach-home-hero'><h1>{staff.name}</h1><p>{day}</p></section>
    <section className='card coach-day-card'>
      <div className='coach-day-head'><h2>Today</h2><span className='pill'>{lessons.length} session{lessons.length === 1 ? '' : 's'}</span></div>
      <div className='coach-lesson-list'>
        {lessons.length ? lessons.map(lesson => <CoachLessonBar key={lesson.id} state={state} lesson={lesson} update={update} />) : <p className='muted'>No sessions assigned today.</p>}
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
    const staff = (state.staff || []).find(person => String(person.accessCode || '') === code);
    if (!staff) {
      setError('Code not recognised');
      return;
    }
    setError('');
    onUnlock(staff.id);
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

function CoachLessonBar({ state, lesson, update }) {
  const learners = state.learners.filter(learner => learner.lesson === lesson.id);
  const isDone = !!lesson.completedAt;
  const isStarted = !!lesson.startedAt && !isDone;

  function openLesson() {
    update({
      lessons: state.lessons.map(item => item.id === lesson.id ? { ...item, startedAt: item.startedAt || new Date().toISOString() } : item),
      active: lesson.id,
      currentDay: lessonDay(lesson),
      step: 'register'
    });
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
    .filter(lesson => staff.role === 'Admin' || lesson.coach === staff.name)
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  return <section className='card coach-day-card'>
    <div className='coach-day-head'><div><p className='muted'>Today</p><h2>{day}</h2></div><span className='pill'>{lessons.length} session{lessons.length === 1 ? '' : 's'}</span></div>
    <div className='coach-lesson-list'>
      {lessons.length ? lessons.map(lesson => <CoachLessonBar key={lesson.id} state={state} lesson={lesson} update={update} />) : <p className='muted'>No sessions assigned today.</p>}
    </div>
  </section>;
}

function CoachWeek({ state, update, staff }) {
  const coachLessons = [...state.lessons]
    .filter(lesson => staff.role === 'Admin' || lesson.coach === staff.name)
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  return <div className='coach-week-grid'>
    {days.map(day => {
      const lessons = coachLessons.filter(lesson => lessonDay(lesson) === day);
      return <section className='card coach-week-day' key={day}>
        <div className='coach-week-day-head'><h2>{day}</h2><span>{lessons.length}</span></div>
        <div className='coach-lesson-list'>
          {lessons.length ? lessons.map(lesson => <CoachLessonBar key={lesson.id} state={state} lesson={lesson} update={update} />) : <p className='muted'>No sessions</p>}
        </div>
      </section>;
    })}
  </div>;
}

function AdminTimetable({ state, update }) {
  const day = state.currentDay || 'Tuesday';
  const sorted = visibleLessonsForDay(state, day).sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  useEffect(() => {
    Promise.all([
      import('./lib/weekCalendarPlanner.js'),
      import('./lib/weekCalendarMove.js'),
      import('./lib/weekCalendarCopy.js')
    ]).catch(error => console.error('Stage Flow admin planner failed to load', error));
  }, []);

  function newLesson() {
    const selectedProgramme = state.timetableFilter && state.timetableFilter !== 'All' ? normaliseProgrammeName(state.timetableFilter) : 'School Swimming';
    const groupId = defaultGroupForProgramme(selectedProgramme, groups(state));
    const id = 'l' + Date.now();
    const lesson = { id, day, time: '09:00', duration: 30, school: defaultSchoolForProgramme(selectedProgramme), year: 'Year group', className: '', coach: '', name: defaultLessonNameForProgramme(selectedProgramme), programme: selectedProgramme, groupTemplateId: groupId, mode: 'Stages + National Curriculum' };
    update({ lessons: [...state.lessons, lesson], active: id, step: 'edit', draft: null });
  }

  return <>
    <section className='card calendar-toolbar'><div><h2>Admin planner · {day}</h2></div><div><Select label='Programme filter' value={state.timetableFilter || 'All'} onChange={v => update({ timetableFilter: v })} options={programmeFilters.map(x => ({ value: x, label: x }))} /><button className='btn org' onClick={newLesson}>+ Add class/session</button></div></section>
    <div className='tabs'>{days.map(d => <button key={d} className={day === d ? 'on' : ''} onClick={() => update({ currentDay: d })}>{d}</button>)}</div>
    {sorted.length ? sorted.map(lesson => <LessonCard key={lesson.id} state={state} update={update} lesson={lesson} />) : <section className='card'><h2>No classes on {day}</h2><button className='btn org' onClick={newLesson}>+ Add class/session</button></section>}
  </>;
}

function Timetable({ state, update }) {
  const [staffId, setStaffId] = useState(() => readCoachSessionStaffId());
  const [view, setView] = useState('today');
  const staff = (state.staff || []).find(person => person.id === staffId) || null;

  function unlock(id) {
    saveCoachSessionStaffId(id);
    setStaffId(id);
    setView('today');
  }

  function signOut() {
    clearCoachSessionStaffId();
    setStaffId('');
    setView('today');
  }

  if (!staff) return <CoachPinGate state={state} onUnlock={unlock} />;

  const canManage = staff.role === 'Admin';
  return <>
    <section className='hero compact-hero coach-hero'>
      <div><p>{staff.role}</p><h1>{staff.name}</h1></div>
      <button className='btn coach-signout' onClick={signOut}>Lock</button>
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
  return <section className='card lesson'><div className='time'>{lesson.time}</div><div><h2>{lesson.name}</h2><p className='muted'>{lessonProgramme(lesson)} · {lesson.school} · {lesson.year}</p><span className='pill'>{groupLabel(state, lesson)}</span><span className='pill'>{swimmers.length} learners</span><span className='pill'>{groupCriteria(state, lesson).length} criteria</span></div><div className='score-buttons'><button className='btn' onClick={() => update({ active: lesson.id, step: 'edit' })}>Edit</button><button className='btn org' onClick={() => update({ active: lesson.id, step: 'register' })}>Open</button></div></section>;
}

function Lesson({ state, update, lesson }) {
  const staff = coachSessionStaff(state);
  const coachOnly = !!staff && staff.role !== 'Admin';
  const requestedStep = state.step || 'register';
  const currentStep = coachOnly && requestedStep === 'edit' ? 'register' : requestedStep;
  const steps = ['edit', 'register', 'assess', 'save'];
  return <>
    {coachOnly ? <section className='hero compact-hero lesson-coach-hero'><div><p>{lesson.time} · {lesson.school}</p><h1>{lesson.name}</h1></div><span>{currentStep === 'register' ? 'Register' : 'Assessment'}</span></section> : <section className='hero'><p>{lessonProgramme(lesson)}</p><h1>{lesson.name}</h1><p>{groupCriteria(state, lesson).length} criteria</p><div className='steps'>{steps.map(step => <span key={step} className={currentStep === step ? 'on' : ''}>{step === 'edit' ? 'Setup' : step === 'assess' ? 'Assess' : step}</span>)}</div></section>}
    {currentStep === 'edit' && !coachOnly && <LessonSetup state={state} update={update} lesson={lesson} />}
    {currentStep === 'register' && <Register state={state} update={update} lesson={lesson} />}
    {currentStep === 'assess' && <Assess state={state} update={update} lesson={lesson} />}
    {currentStep === 'save' && <SaveLesson state={state} update={update} lesson={lesson} />}
  </>;
}

function LessonSetup({ state, update, lesson }) {
  const templateOptions = groupOptionsForLesson(state, lesson);
  const criteria = groupCriteria(state, lesson);
  function patchLesson(patch) {
    let changed = { ...lesson, ...patch };
    let learners = state.learners;
    if (patch.programme) {
      const programme = normaliseProgrammeName(patch.programme);
      const nextGroup = defaultGroupForProgramme(programme, groups(state));
      changed = { ...changed, programme, groupTemplateId: nextGroup, school: defaultSchoolForProgramme(programme), name: lesson.name?.startsWith('New ') ? defaultLessonNameForProgramme(programme) : lesson.name };
      learners = learners.map(p => p.lesson === lesson.id ? { ...p, stage: firstStageForGroup(state, nextGroup) } : p);
    }
    if (patch.groupTemplateId) {
      const groupStage = firstStageForGroup(state, patch.groupTemplateId);
      learners = learners.map(p => p.lesson === lesson.id ? { ...p, stage: groupStage } : p);
    }
    update({ lessons: state.lessons.map(l => l.id === lesson.id ? changed : l), learners });
  }
  function deleteLesson() {
    update({ lessons: state.lessons.filter(l => l.id !== lesson.id), learners: state.learners.filter(p => p.lesson !== lesson.id), step: 'list', active: '' });
  }
  return <>
    <section className='card assessment-choice'><h2>Class/session setup</h2><div className='grid2'><Select label='Programme' value={lessonProgramme(lesson)} onChange={v => patchLesson({ programme: v })} options={programmes.map(x => ({ value: x, label: x }))} /><Select label='Criteria group' value={lesson.groupTemplateId || ''} onChange={v => patchLesson({ groupTemplateId: v })} options={templateOptions} /><Field label='Class/session name' value={lesson.name} onChange={v => patchLesson({ name: v })} /><Field label='School / venue' value={lesson.school} onChange={v => patchLesson({ school: v })} /><Field label='Year / class' value={lesson.year} onChange={v => patchLesson({ year: v })} /><Field label='Coach' value={lesson.coach || ''} onChange={v => patchLesson({ coach: v })} /><Select label='Day' value={lessonDay(lesson)} onChange={v => patchLesson({ day: v })} options={days.map(x => ({ value: x, label: x }))} /><Field label='Start time' value={lesson.time} onChange={v => patchLesson({ time: v })} /><Select label='Duration' value={String(lesson.duration || 30)} onChange={v => patchLesson({ duration: Number(v) || 30 })} options={durations.map(x => ({ value: String(x), label: `${x} minutes` }))} /><Select label='Assessment mode' value={lesson.mode || modes[0]} onChange={v => patchLesson({ mode: v })} options={modes.map(x => ({ value: x, label: x }))} /></div></section>
    <section className='card'><h2>Criteria preview</h2><p className='muted'>{groupLabel(state, lesson)}</p>{criteria.length ? criteria.map(c => <div className='folder' key={c}>• {c}</div>) : <p className='muted'>This session is National Curriculum only.</p>}</section>
    <div className='footer'><button className='btn' onClick={() => update({ step: 'list' })}>Back to timetable</button><button className='btn' onClick={deleteLesson}>Delete</button><button className='btn org' onClick={() => update({ step: 'register' })}>Register learners</button></div>
  </>;
}

function Register({ state, update, lesson }) {
  const kids = state.learners.filter(p => p.lesson === lesson.id);
  const [names, setNames] = useState('');
  const staff = coachSessionStaff(state);
  const coachOnly = !!staff && staff.role !== 'Admin';

  function changeLearner(id, patch) {
    update({ learners: state.learners.map(p => p.id === id ? { ...p, ...patch } : p) });
  }

  function addNames() {
    const newKids = createLearnersFromText(names, lesson.id, firstStageForGroup(state, lesson.groupTemplateId));
    if (!newKids.length) return;
    update({ learners: [...state.learners, ...newKids], selected: newKids[0].id });
    setNames('');
  }

  function removeLearner(id) {
    update({ learners: state.learners.filter(p => p.id !== id), selected: state.selected === id ? '' : state.selected });
  }

  return <>
    <section className='card register-card'>
      <div className='register-head'><h2>Register</h2><span className='pill'>{kids.length} child{kids.length === 1 ? '' : 'ren'}</span></div>
      <div className='register-list'>
        {kids.map(p => <div className='register-person' key={p.id}>
          <div className='register-person-main'>
            <b>{p.name}</b>
            <small>{completionText(state, lesson, p)}</small>
          </div>
          <select className={'attendance-select ' + (p.att === 'Absent' ? 'absent' : '')} value={p.att || 'Present'} onChange={e => changeLearner(p.id, { att: e.target.value })} aria-label={`${p.name} attendance`}>
            {attendanceOptions.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
          {!coachOnly && <button className='register-remove' onClick={() => removeLearner(p.id)}>Remove</button>}
        </div>)}
      </div>
    </section>
    {!coachOnly && <section className='card'><h2>Add learners</h2><p className='muted'>One name per line.</p><textarea value={names} onChange={e => setNames(e.target.value)} placeholder={'Pippa B\nArchie T\nMia J'} /><button className='btn org' onClick={addNames}>Add names</button></section>}
    <div className='footer'><button className='btn' onClick={() => update(coachOnly ? { step: 'list', active: '' } : { step: 'edit' })}>{coachOnly ? 'Back to today' : 'Back'}</button><button className='btn org' onClick={() => update({ step: 'assess', selected: kids.find(p => p.att !== 'Absent')?.id || kids[0]?.id || '', assessmentMode: 'swimmer' })}>Assess</button></div>
  </>;
}

function Assess({ state, update, lesson }) {
  const kids = state.learners.filter(p => p.lesson === lesson.id && p.att !== 'Absent');
  const criteria = groupCriteria(state, lesson);
  const selected = kids.find(p => p.id === state.selected) || kids[0];
  const selectedSkill = criteria.includes(state.selectedSkill) ? state.selectedSkill : criteria[0] || '';
  const mode = state.assessmentMode || 'swimmer';
  const showNationalCurriculum = lessonProgramme(lesson) === 'School Swimming';
  const staff = coachSessionStaff(state);
  const coachOnly = !!staff && staff.role !== 'Admin';
  const [detailView, setDetailView] = useState('list');

  function changeLearner(id, patch) {
    update({ learners: state.learners.map(p => p.id === id ? { ...p, ...patch } : p) });
  }

  function scoreLearner(learner, criteriaItem, value) {
    if (!criteriaItem || !learner) return;
    changeLearner(learner.id, { res: { ...(learner.res || {}), [criteriaItem]: value } });
  }

  function setDistanceForLearner(learner, stroke, value) {
    const metres = distanceNumber(value);
    changeLearner(learner.id, {
      dist: { ...(learner.dist || {}), [stroke]: value },
      res: applyDistanceAutoPass(state, learner.res, stroke, metres)
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
          const marked = criteria.filter(skill => isMarkedAssessment(child.res?.[skill])).length;
          const progressClass = marked && marked === criteria.length ? ' all-marked' : marked ? ' started' : '';
          return <button className={'assessment-list-button' + progressClass} key={child.id} onClick={() => openChild(child)}>
            <span><strong>{child.name}</strong><small>{childAssessmentSummary(criteria, child)}</small></span>
            <b>›</b>
          </button>;
        })}
      </div>
    </section>}

    {individualDetail && <section className='card assessment-card'>
      <button className='assessment-back' onClick={() => setDetailView('list')}>‹ Back to children</button>
      <div className='assessment-head'><div><h2>{selected.name}</h2><p className='muted'>{childAssessmentSummary(criteria, selected)}</p></div></div>
      {lesson.mode !== 'National Curriculum only' && <>
        <div className='grid2'><Distance label='Distance front' value={selected.dist?.front || '0m'} onChange={v => setDistanceForLearner(selected, 'front', v)} /><Distance label='Distance back' value={selected.dist?.back || '0m'} onChange={v => setDistanceForLearner(selected, 'back', v)} /></div>
        <p className='muted'>Higher distances also mark matching lower-distance skills.</p>
        {criteria.map(skill => <SkillScore key={skill} criteria={skill} value={selected.res?.[skill]} onScore={v => scoreLearner(selected, skill, v)} />)}
      </>}
      {showNationalCurriculum && <>
        <h3>National Curriculum</h3>
        {nationalCurriculum.map(item => <label className='pill' key={item}><input type='checkbox' checked={!!selected.nc?.[item]} onChange={e => changeLearner(selected.id, { nc: { ...(selected.nc || {}), [item]: e.target.checked } })} /> {item}</label>)}
      </>}
    </section>}

    {groupList && <section className='card assessment-picker'>
      <div className='assessment-picker-head'><h2>Choose a skill</h2><span className='pill'>{criteria.length} skill{criteria.length === 1 ? '' : 's'}</span></div>
      {criteria.length ? <div className='assessment-list'>
        {criteria.map(skill => {
          const assessed = kids.filter(child => isMarkedAssessment(child.res?.[skill])).length;
          const progressClass = assessed && assessed === kids.length ? ' all-marked' : assessed ? ' started' : '';
          return <button className={'assessment-list-button' + progressClass} key={skill} onClick={() => openSkill(skill)}>
            <span><strong>{skill}</strong><small>{assessed ? `${assessed}/${kids.length} marked` : 'Not marked yet'}</small></span>
            <b>›</b>
          </button>;
        })}
      </div> : <p className='muted'>This session has no group skills to assess.</p>}
    </section>}

    {groupDetail && <section className='card skill-assessment'>
      <button className='assessment-back' onClick={() => setDetailView('list')}>‹ Back to skills</button>
      <div className='assessment-head'><div><h2>{selectedSkill}</h2><p className='muted'>{kids.length} child{kids.length === 1 ? '' : 'ren'}</p></div></div>
      <div className='skill-list'>
        {kids.map(child => <div className='skill-row' key={child.id}>
          <div><h3>{child.name}</h3></div>
          <div className='score-buttons'>{scores.map(v => <button className={'score-btn ' + (child.res?.[selectedSkill] === v ? 'on' : '')} key={v} onClick={() => scoreLearner(child, selectedSkill, v)}>{scoreButtonLabels[v]}</button>)}</div>
        </div>)}
      </div>
    </section>}

    <div className='footer'>
      <button className='btn' onClick={() => update({ step: 'register' })}>Back</button>
      {coachOnly ? <button className='btn org' onClick={() => update({ lessons: state.lessons.map(item => item.id === lesson.id ? { ...item, completedAt: new Date().toISOString() } : item), step: 'list', active: '' })}>Save & finish</button> : <button className='btn org' onClick={() => update({ step: 'save' })}>Save session</button>}
    </div>
  </>;
}

function SkillScore({ criteria, value, onScore }) {
  return <div className='criteria skill-card'><b>{criteria}</b><div className='score-buttons'>{scores.map(v => <button className={'score-btn ' + (value === v ? 'on' : '')} key={v} onClick={() => onScore(v)}>{scoreButtonLabels[v]}</button>)}</div></div>;
}

function SaveLesson({ state, update, lesson }) {
  const kids = state.learners.filter(p => p.lesson === lesson.id);
  const present = kids.filter(p => p.att !== 'Absent');
  const criteria = groupCriteria(state, lesson);
  const complete = present.filter(p => criteria.length && criteria.every(c => p.res?.[c] === 'pass'));
  return <>
    <section className='card'><h2>Session saved</h2><p className='muted'>{lesson.name}</p><div className='grid stat-grid'><div className='card stat-card'><h2>{present.length}</h2><p className='muted'>Present</p></div><div className='card stat-card'><h2>{complete.length}</h2><p className='muted'>Completed criteria</p></div><div className='card stat-card'><h2>{criteria.length}</h2><p className='muted'>Criteria assessed</p></div></div></section>
    <section className='card'><h2>Session summary</h2>{present.map(p => <div className='folder' key={p.id}>{p.name}: {completionText(state, lesson, p)}</div>)}</section>
    <div className='footer'><button className='btn' onClick={() => update({ step: 'assess' })}>Back to assessment</button><button className='btn org' onClick={() => update({ lessons: state.lessons.map(item => item.id === lesson.id ? { ...item, completedAt: new Date().toISOString() } : item), step: 'list', active: '' })}>Finish</button></div>
  </>;
}

function HealthCheck({ state, update }) {
  const items = useMemo(() => getHealthItems(state), [state]);
  const done = items.filter(item => item.done).length;
  const failed = items.filter(item => !item.done);
  const percent = Math.round((done / items.length) * 100);
  const testSteps = ['Open Home', 'Open Timetable', 'Create or edit a class/session', 'Choose a criteria group', 'Paste learners', 'Complete register', 'Assess by name', 'Assess by skill', 'Save session', 'Open Reports', 'Open Settings'];
  return <><section className='hero'><p>Priority 1</p><h1>Stability health check</h1><p>{percent}% of automatic checks are passing.</p></section><div className='grid'><div className='card'><h2>{percent}%</h2><p className='muted'>Automatic stability score</p></div><div className='card'><h2>{done}/{items.length}</h2><p className='muted'>Checks passing</p></div><div className='card'><h2>{state.audit?.length || 0}</h2><p className='muted'>Audit entries</p></div></div><section className='card'><h2>{failed.length ? 'Needs checks' : 'Ready for manual sign-off'}</h2><p className='muted'>{failed.length ? 'Fix the warnings below before moving on.' : 'Run the manual test route once on your phone.'}</p></section><section className='card'><h2>✅ Passed</h2>{items.filter(item => item.done).map(item => <div className='folder' key={item.label}>✅ {item.label}<p className='muted'>{item.detail}</p></div>)}</section><section className='card'><h2>⚠️ Needs fixing</h2>{failed.length ? failed.map(item => <div className='folder' key={item.label}>⚠️ {item.label}<p className='muted'>{item.detail}</p></div>) : <div className='folder'>✅ Nothing currently flagged.</div>}</section><section className='card'><h2>Manual live test route</h2>{testSteps.map((step, index) => <div className='folder' key={step}>#{index + 1} {step}</div>)}</section><div className='footer'><button className='btn' onClick={() => { clearAppState(); location.reload(); }}>Reset app data</button><button className='btn org' onClick={() => update({ screen: 'timetable', step: 'list' })}>Test timetable</button></div></>;
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
    const complete = criteria.length ? swimmers.filter(p => criteria.every(c => p.res?.[c] === 'pass')).length : 0;
    return { lesson, swimmers, criteria, complete };
  });
  return <><section className='hero compact-hero'><h1>Progress</h1></section><div className='grid2'>{lessons.map(({ lesson, swimmers, criteria, complete }) => <section className='card' key={lesson.id}><h2>{lesson.name}</h2><p className='muted'>{lessonProgramme(lesson)} · {groupLabel(state, lesson)}</p><span className='pill'>{swimmers.length} learners</span><span className='pill'>{criteria.length} criteria</span><span className='pill'>{complete} complete</span>{swimmers.map(p => <div className='folder' key={p.id}>{p.name}: {completionText(state, lesson, p)}</div>)}</section>)}</div><section className='card'><h2>End-of-term pack</h2><p className='muted'>This will later become the printable/export pack. For now, it is showing live progress from criteria groups.</p><button className='btn org' onClick={() => update({ audit: [`Progress pack checked`, ...(state.audit || [])] })}>Log pack check</button></section></>;
}

function Settings({ state, update }) {
  const tabs = ['groups', 'framework', 'certificates', 'permissions', 'audit'];
  return <><section className='hero compact-hero'><h1>Settings</h1></section><div className='tabs'>{tabs.map(t => <button key={t} className={(state.tab || 'groups') === t ? 'on' : ''} onClick={() => update({ tab: t })}>{t === 'groups' ? 'criteria groups' : t}</button>)}</div>{(state.tab || 'groups') === 'groups' && <Groups state={state} update={update} />}{state.tab === 'framework' && <Framework state={state} update={update} />}{state.tab === 'certificates' && <Certificates state={state} update={update} />}{state.tab === 'permissions' && <Permissions state={state} update={update} />}{state.tab === 'audit' && <section className='card'><h2>Audit log</h2>{(state.audit || []).map((a, i) => <p key={i}>• {a}</p>)}</section>}</>;
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
function Framework({ state, update }) {
  function setCriteria(stage, text) {
    update({ framework: { ...state.framework, criteria: { ...state.framework.criteria, [stage]: text.split('\n').map(x => x.trim()).filter(Boolean) } } });
  }
  function addStage() {
    const name = 'New Criteria Section ' + (state.framework.stages.length + 1);
    update({ framework: { ...state.framework, stages: [...state.framework.stages, name], criteria: { ...state.framework.criteria, [name]: [] } } });
  }
  return <section className='card'><h2>Criteria framework</h2><p className='muted'>These are the criteria sections that groups can use.</p><Field label='Framework name' value={state.framework.name} onChange={v => update({ framework: { ...state.framework, name: v } })} /><button className='btn org' onClick={addStage}>+ Add criteria section</button>{state.framework.stages.map(stage => <div className='card' key={stage}><h3>{stage}</h3><textarea value={(state.framework.criteria?.[stage] || []).join('\n')} onChange={e => setCriteria(stage, e.target.value)} /></div>)}</section>;
}
function Certificates({ state, update }) {
  function addCert() {
    update({ certificates: [...state.certificates, { id: 'cert' + Date.now(), name: 'New Certificate Template', rule: 'Criteria group complete', font: 'Serif', size: 32, groupBy: 'Criteria group' }] });
  }
  return <section className='card'><h2>Certificate templates</h2><p className='muted'>Certificate generation is still demo-level, but it now points at criteria completion rather than initial placement.</p><button className='btn org' onClick={addCert}>+ Add certificate template</button>{state.certificates.map(c => <div className='card' key={c.id}><Field label='Name' value={c.name} onChange={v => update({ certificates: state.certificates.map(x => x.id === c.id ? { ...x, name: v } : x) })} /><Select label='Rule' value={c.rule} onChange={v => update({ certificates: state.certificates.map(x => x.id === c.id ? { ...x, rule: v } : x) })} options={['Criteria group complete', 'National Curriculum achieved', 'Selected award only'].map(x => ({ value: x, label: x }))} /><Select label='Group by' value={c.groupBy} onChange={v => update({ certificates: state.certificates.map(x => x.id === c.id ? { ...x, groupBy: v } : x) })} options={['Criteria group', 'School / venue', 'Award', 'All in one PDF'].map(x => ({ value: x, label: x }))} /></div>)}</section>;
}
function Permissions({ state, update }) {
  return <section className='card'><h2>Staff permissions</h2>{state.staff.map(staff => <div className='card' key={staff.id}><h3>{staff.name}</h3><p className='muted'>{staff.role}</p>{['sessions', 'groups', 'learners', 'assess', 'export', 'framework', 'certificates'].map(key => <label className='pill' key={key}><input type='checkbox' checked={!!staff[key]} onChange={e => update({ staff: state.staff.map(s => s.id === staff.id ? { ...s, [key]: e.target.checked } : s) })} /> {key}</label>)}</div>)}</section>;
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

createRoot(document.getElementById('root')).render(<App />);
