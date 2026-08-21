import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';
import './styles/calendar-overlay.css';
import { demoFramework, demoLearners, demoLessons, nationalCurriculum, stageCriteria, programmeAreas } from './data/demoData.js';
import { loadAppState, saveAppState, clearAppState } from './lib/localStore.js';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const durations = [15, 30, 45, 60, 75, 90, 105, 120];
const modes = ['Stages + National Curriculum', 'National Curriculum only'];
const attendanceOptions = ['Present', 'Absent', 'Late', 'Not Taking Part'];
const scores = ['no', 'float', 'pass'];
const scoreLabels = { no: 'Not seen', float: 'Needs work', pass: 'Passed' };
const distances = ['0m', '5m', '10m', '15m', '20m', '25m', '50m', '100m'];
const programmeFilters = ['All', ...(programmeAreas || ['School Swimming', 'Evening Swim Lessons', 'Private Lessons', 'School PE', 'Gymnastics', 'Custom'])];
const assessmentModes = [
  { id: 'swimmer', title: 'Assess by swimmer', detail: 'Pick a name and mark this group criteria.' },
  { id: 'skill', title: 'Assess by skill', detail: 'Pick one group skill and mark everyone.' }
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
  lessons: demoLessons.map(l => ({ day: 'Tuesday', duration: 30, className: '', coach: '', groupTemplateId: 'g1', programme: l.programme || demoFramework.area || 'School Swimming', ...l })),
  learners: demoLearners,
  framework: demoFramework,
  certificates: [
    { id: 'cert1', name: 'Highest Stage Certificate', rule: 'Highest achieved stage', font: 'Serif', size: 34, groupBy: 'Year group' },
    { id: 'cert2', name: 'National Curriculum Certificate', rule: 'National Curriculum achieved', font: 'Sans Serif', size: 28, groupBy: 'Award' }
  ],
  staff: [
    { id: 's1', name: 'Lewis', role: 'Lead Coach', sessions: true, groups: true, learners: true, assess: true, export: false, framework: false, certificates: false },
    { id: 's2', name: 'Sarah', role: 'Coach', sessions: true, groups: false, learners: true, assess: true, export: false, framework: false, certificates: false },
    { id: 's3', name: 'Admin User', role: 'Admin', sessions: true, groups: true, learners: true, assess: true, export: true, framework: true, certificates: true }
  ],
  pack: { reports: true, certificates: true, registers: true, nc: true, support: true, raw: false, email: 'office@greenfieldprimary.co.uk', cc: 'manager@example.com', method: 'Secure download link' },
  audit: ['Group criteria assessment flow added']
};

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
function firstStageForGroup(state, groupId) {
  const group = groupFor(state, groupId);
  return group?.stages?.[0] || state.framework?.stages?.[0] || 'Stage 1';
}
function lessonProgramme(lesson) {
  if (lesson?.programme) return lesson.programme;
  const text = `${lesson?.school || ''} ${lesson?.name || ''} ${lesson?.year || ''}`.toLowerCase();
  if (text.includes('evening')) return 'Evening Swim Lessons';
  if (text.includes('private')) return 'Private Lessons';
  if (text.includes('gym')) return 'Gymnastics';
  if (text.includes('pe')) return 'School PE';
  return 'School Swimming';
}
function defaultSchoolForProgramme(programme) {
  if (programme === 'Evening Swim Lessons') return 'Evening Swim Lessons';
  if (programme === 'Private Lessons') return 'Private Client';
  return 'New School';
}
function visibleLessonsForDay(state, day) {
  const filter = state.timetableFilter || 'All';
  return [...state.lessons].filter(l => lessonDay(l) === day && (filter === 'All' || lessonProgramme(l) === filter));
}
function stageSortValue(stage) {
  const match = String(stage || '').match(/Stage\s*(\d+)/i);
  if (match) return Number(match[1]);
  if (String(stage).toLowerCase().includes('self rescue')) return 900;
  return 800;
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
  return group ? `${group.name} · ${group.detail || group.stages?.join(', ') || 'Group criteria'}` : 'No group selected';
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
  return `${passed}/${criteria.length} group criteria passed`;
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
  function update(next) {
    const newState = typeof next === 'function' ? next(state) : { ...state, ...next };
    setState(newState);
    saveAppState(newState);
  }
  const lesson = state.lessons.find(l => l.id === state.active);
  const screens = ['home', 'timetable', 'health', 'reports', 'settings'];
  return <>
    <div className='top'><div className='brand'>Stage Flow</div><button className='btn' onClick={() => { clearAppState(); location.reload(); }}>Reset</button></div>
    <div className='wrap'>
      <nav className='rail'>{screens.map(screen => <button key={screen} className={state.screen === screen ? 'on' : ''} onClick={() => update({ screen, step: 'list' })}>{screen[0].toUpperCase()}</button>)}</nav>
      <main>
        {state.screen === 'home' && <Home state={state} update={update} />}
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
  return <section className='card'><h2>Lesson not found</h2><p className='muted'>That lesson may have been deleted or old saved data pointed to a missing lesson.</p><button className='btn org' onClick={() => update({ screen: 'timetable', step: 'list', active: '' })}>Back to timetable</button></section>;
}

function Home({ state, update }) {
  const day = state.currentDay || 'Tuesday';
  const next = state.lessons.find(l => lessonDay(l) === day) || state.lessons[0];
  const ncDone = state.learners.filter(p => nationalCurriculum.every(item => p.nc?.[item])).length;
  const health = getHealthItems(state);
  const done = health.filter(item => item.done).length;
  const percent = Math.round((done / health.length) * 100);
  const groupsCount = groups(state).length;
  return <>
    <section className='hero stage-hero'><p>Teach. Track. Progress.</p><h1>Group-based swim assessment, without the paperwork fog.</h1><p>Create a lesson, choose the group, then assess every swimmer against that group’s criteria.</p></section>
    <section className='quick-actions'>
      <button className='action-card primary-action' onClick={() => next && update({ screen: 'timetable', active: next.id, step: 'assess', assessmentMode: 'swimmer', selected: state.learners.find(p => p.lesson === next.id && p.att !== 'Absent')?.id || '' })}><span>Start Assessment</span><small>Use today’s group criteria</small></button>
      <button className='action-card' onClick={() => update({ screen: 'timetable', step: 'list' })}><span>My Timetable</span><small>Lessons and registers</small></button>
      <button className='action-card' onClick={() => update({ screen: 'settings', tab: 'groups' })}><span>My Groups</span><small>{groupsCount} assessment groups</small></button>
      <button className='action-card' onClick={() => update({ screen: 'reports' })}><span>Progress Overview</span><small>Who is nearly complete</small></button>
    </section>
    {next ? <section className='card lesson next-lesson'><div className='time'>{next.time}</div><div><h2>{next.name}</h2><p className='muted'>{lessonDay(next)} · {lessonProgramme(next)} · {next.school} · {next.year}</p><span className='pill'>{groupLabel(state, next)}</span><span className='pill'>{groupCriteria(state, next).length} criteria</span><span className='pill'>Register → Assess group → Save</span></div><button className='btn org' onClick={() => update({ screen: 'timetable', active: next.id, step: 'register' })}>Open lesson</button></section> : <section className='card'><h2>No lessons yet</h2><p className='muted'>Go to Timetable and create your first group session.</p></section>}
    <div className='grid stat-grid'><div className='card stat-card'><h2>{state.lessons.length}</h2><p className='muted'>Lessons</p></div><div className='card stat-card'><h2>{state.learners.length}</h2><p className='muted'>Swimmers</p></div><div className='card stat-card'><h2>{ncDone}</h2><p className='muted'>NC achieved</p></div></div>
    <section className='card'><h2>Build health</h2><p className='muted'>{percent}% checked inside the app</p><button className='btn org' onClick={() => update({ screen: 'health' })}>Open health check</button></section>
  </>;
}

function Timetable({ state, update }) {
  const day = state.currentDay || 'Tuesday';
  const sorted = visibleLessonsForDay(state, day).sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  function newLesson() {
    const groupId = groups(state)[0]?.id || '';
    const id = 'l' + Date.now();
    const lesson = { id, day, time: '09:00', duration: 30, school: 'New School', year: 'Year group', className: '', coach: '', name: 'New Group Lesson', programme: 'School Swimming', groupTemplateId: groupId, mode: 'Stages + National Curriculum' };
    update({ lessons: [...state.lessons, lesson], active: id, step: 'edit', draft: null });
  }
  return <>
    <section className='hero'><p>Lesson plan</p><h1>Choose the group first. Assess that group criteria.</h1><p>No separate initial assessment screen. The group is the assessment level.</p></section>
    <div className='tabs'>{days.map(d => <button key={d} className={day === d ? 'on' : ''} onClick={() => update({ currentDay: d })}>{d}</button>)}</div>
    <section className='card calendar-toolbar'><div><h2>{day}</h2><p className='muted'>Filtered by programme and organised by lesson group.</p></div><div><Select label='Programme filter' value={state.timetableFilter || 'All'} onChange={v => update({ timetableFilter: v })} options={programmeFilters.map(x => ({ value: x, label: x }))} /><button className='btn org' onClick={newLesson}>+ Add group lesson</button></div></section>
    {sorted.length ? sorted.map(lesson => <LessonCard key={lesson.id} state={state} update={update} lesson={lesson} />) : <section className='card'><h2>No lessons on {day}</h2><p className='muted'>Add a group lesson to start building the timetable.</p><button className='btn org' onClick={newLesson}>+ Add group lesson</button></section>}
  </>;
}

function LessonCard({ state, update, lesson }) {
  const swimmers = state.learners.filter(p => p.lesson === lesson.id);
  return <section className='card lesson'><div className='time'>{lesson.time}</div><div><h2>{lesson.name}</h2><p className='muted'>{lessonProgramme(lesson)} · {lesson.school} · {lesson.year}</p><span className='pill'>{groupLabel(state, lesson)}</span><span className='pill'>{swimmers.length} swimmers</span><span className='pill'>{groupCriteria(state, lesson).length} criteria</span></div><div className='score-buttons'><button className='btn' onClick={() => update({ active: lesson.id, step: 'edit' })}>Edit</button><button className='btn org' onClick={() => update({ active: lesson.id, step: 'register' })}>Open</button></div></section>;
}

function Lesson({ state, update, lesson }) {
  const currentStep = state.step || 'register';
  return <>
    <section className='hero'><p>{lessonProgramme(lesson)}</p><h1>{lesson.name}</h1><p>{groupLabel(state, lesson)} · {groupCriteria(state, lesson).length} group criteria</p><div className='steps'>{['edit', 'register', 'assess', 'save'].map(step => <span key={step} className={currentStep === step ? 'on' : ''}>{step === 'edit' ? 'Setup' : step === 'assess' ? 'Assess group' : step}</span>)}</div></section>
    {currentStep === 'edit' && <LessonSetup state={state} update={update} lesson={lesson} />}
    {currentStep === 'register' && <Register state={state} update={update} lesson={lesson} />}
    {currentStep === 'assess' && <Assess state={state} update={update} lesson={lesson} />}
    {currentStep === 'save' && <SaveLesson state={state} update={update} lesson={lesson} />}
  </>;
}

function LessonSetup({ state, update, lesson }) {
  const templateOptions = groups(state).map(g => ({ value: g.id, label: `${g.name} — ${g.detail || g.stages?.join(', ') || 'Group criteria'}` }));
  const criteria = groupCriteria(state, lesson);
  function patchLesson(patch) {
    let changed = { ...lesson, ...patch };
    let learners = state.learners;
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
    <section className='card assessment-choice'><h2>Lesson setup</h2><p className='muted'>Pick the programme and group. Every swimmer in this lesson will be assessed against this group’s criteria.</p><div className='grid2'><Select label='Programme' value={lesson.programme || 'School Swimming'} onChange={v => patchLesson({ programme: v, school: defaultSchoolForProgramme(v) })} options={programmeAreas.map(x => ({ value: x, label: x }))} /><Select label='Assessment group' value={lesson.groupTemplateId || ''} onChange={v => patchLesson({ groupTemplateId: v })} options={templateOptions} /><Field label='Lesson name' value={lesson.name} onChange={v => patchLesson({ name: v })} /><Field label='School / venue' value={lesson.school} onChange={v => patchLesson({ school: v })} /><Field label='Year / class' value={lesson.year} onChange={v => patchLesson({ year: v })} /><Field label='Coach' value={lesson.coach || ''} onChange={v => patchLesson({ coach: v })} /><Select label='Day' value={lessonDay(lesson)} onChange={v => patchLesson({ day: v })} options={days.map(x => ({ value: x, label: x }))} /><Field label='Start time' value={lesson.time} onChange={v => patchLesson({ time: v })} /><Select label='Duration' value={String(lesson.duration || 30)} onChange={v => patchLesson({ duration: Number(v) || 30 })} options={durations.map(x => ({ value: String(x), label: `${x} minutes` }))} /><Select label='Assessment mode' value={lesson.mode || modes[0]} onChange={v => patchLesson({ mode: v })} options={modes.map(x => ({ value: x, label: x }))} /></div></section>
    <section className='card'><h2>Group criteria preview</h2><p className='muted'>{groupLabel(state, lesson)}</p>{criteria.length ? criteria.map(c => <div className='folder' key={c}>• {c}</div>) : <p className='muted'>This lesson is National Curriculum only.</p>}</section>
    <div className='footer'><button className='btn' onClick={() => update({ step: 'list' })}>Back to timetable</button><button className='btn' onClick={deleteLesson}>Delete</button><button className='btn org' onClick={() => update({ step: 'register' })}>Register swimmers</button></div>
  </>;
}

function Register({ state, update, lesson }) {
  const kids = state.learners.filter(p => p.lesson === lesson.id);
  const [names, setNames] = useState('');
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
    <section className='card'><h2>Register swimmers</h2><p className='muted'>These swimmers will all use {groupLabel(state, lesson)}.</p>{kids.map(p => <div className='criteria register-row' key={p.id}><div><b>{p.name}</b><p className='muted'>{p.att} · {completionText(state, lesson, p)}</p></div><div className='score-buttons'>{attendanceOptions.map(option => <button key={option} className={'score-btn ' + (p.att === option ? 'on' : '')} onClick={() => changeLearner(p.id, { att: option })}>{option}</button>)}<button className='score-btn' onClick={() => removeLearner(p.id)}>Remove</button></div></div>)}</section>
    <section className='card'><h2>Add swimmers</h2><p className='muted'>Paste one name per line. No stage needed — the lesson group controls the criteria.</p><textarea value={names} onChange={e => setNames(e.target.value)} placeholder={'Pippa B\nArchie T\nMia J'} /><button className='btn org' onClick={addNames}>Add names to this group</button></section>
    <div className='footer'><button className='btn' onClick={() => update({ step: 'edit' })}>Back</button><button className='btn org' onClick={() => update({ step: 'assess', selected: kids.find(p => p.att !== 'Absent')?.id || kids[0]?.id || '', assessmentMode: 'swimmer' })}>Assess group</button></div>
  </>;
}

function Assess({ state, update, lesson }) {
  const kids = state.learners.filter(p => p.lesson === lesson.id && p.att !== 'Absent');
  const criteria = groupCriteria(state, lesson);
  const selected = kids.find(p => p.id === state.selected) || kids[0];
  const selectedSkill = criteria.includes(state.selectedSkill) ? state.selectedSkill : criteria[0] || '';
  const mode = state.assessmentMode || 'swimmer';
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
  if (!kids.length) {
    return <><section className='card'><h2>No swimmers to assess</h2><p className='muted'>Mark swimmers as present on the register first.</p></section><div className='footer'><button className='btn' onClick={() => update({ step: 'register' })}>Back to register</button></div></>;
  }
  return <>
    <section className='card assessment-choice'><h2>Assess group criteria</h2><p className='muted'>{groupLabel(state, lesson)}. Choose a swimmer or choose one skill for the whole group.</p><div className='assess-mode-grid'>{assessmentModes.map(item => <button key={item.id} className={'assess-mode ' + (mode === item.id ? 'on' : '')} onClick={() => update({ assessmentMode: item.id, selectedSkill })}><strong>{item.title}</strong><small>{item.detail}</small></button>)}</div></section>
    {mode === 'swimmer' && selected && <div className='grid2 assessment-layout'><section className='card learner-rail'><h2>Swimmers</h2>{kids.map(p => <button className={'learner-button ' + (p.id === selected.id ? 'on' : '')} key={p.id} onClick={() => update({ selected: p.id })}><span>{p.name}</span><small>{completionText(state, lesson, p)}</small></button>)}</section><section className='card assessment-card'><div className='assessment-head'><div><h2>{selected.name}</h2><p className='muted'>{groupLabel(state, lesson)} · {completionText(state, lesson, selected)}</p></div><span className='pill'>By swimmer</span></div>{lesson.mode !== 'National Curriculum only' && <><div className='grid2'><Distance label='Distance front' value={selected.dist?.front || '0m'} onChange={v => setDistanceForLearner(selected, 'front', v)} /><Distance label='Distance back' value={selected.dist?.back || '0m'} onChange={v => setDistanceForLearner(selected, 'back', v)} /></div><p className='muted'>Distance auto-pass: choosing 15m also passes matching 5m and 10m skills for that stroke.</p>{criteria.map(c => <SkillScore key={c} criteria={c} value={selected.res?.[c]} onScore={v => scoreLearner(selected, c, v)} />)}</>}<h3>National Curriculum</h3>{nationalCurriculum.map(item => <label className='pill' key={item}><input type='checkbox' checked={!!selected.nc?.[item]} onChange={e => changeLearner(selected.id, { nc: { ...(selected.nc || {}), [item]: e.target.checked } })} /> {item}</label>)}</section></div>}
    {mode === 'skill' && <section className='card skill-assessment'><div className='assessment-head'><div><h2>Assess one group skill</h2><p className='muted'>Pick a skill from this group criteria and mark each present swimmer.</p></div><span className='pill'>By skill</span></div>{criteria.length ? <><Select label='Group skill' value={selectedSkill} onChange={v => update({ selectedSkill: v })} options={criteria.map(x => ({ value: x, label: x }))} /><div className='skill-list'>{kids.map(p => <div className='skill-row' key={p.id}><div><h3>{p.name}</h3><p className='muted'>{completionText(state, lesson, p)}</p></div><div className='score-buttons'>{scores.map(v => <button className={'score-btn ' + (p.res?.[selectedSkill] === v ? 'on' : '')} key={v} onClick={() => scoreLearner(p, selectedSkill, v)}>{scoreLabels[v]}</button>)}</div></div>)}</div></> : <p className='muted'>This lesson is National Curriculum only, so there are no group skills to assess here.</p>}</section>}
    <div className='footer'><button className='btn' onClick={() => update({ step: 'register' })}>Back</button><button className='btn org' onClick={() => update({ step: 'save' })}>Save lesson</button></div>
  </>;
}

function SkillScore({ criteria, value, onScore }) {
  return <div className='criteria skill-card'><b>{criteria}</b><div className='score-buttons'>{scores.map(v => <button className={'score-btn ' + (value === v ? 'on' : '')} key={v} onClick={() => onScore(v)}>{scoreLabels[v]}</button>)}</div></div>;
}

function SaveLesson({ state, update, lesson }) {
  const kids = state.learners.filter(p => p.lesson === lesson.id);
  const present = kids.filter(p => p.att !== 'Absent');
  const complete = present.filter(p => groupCriteria(state, lesson).length && groupCriteria(state, lesson).every(c => p.res?.[c] === 'pass'));
  return <>
    <section className='card'><h2>Lesson saved</h2><p className='muted'>{lesson.name} · {groupLabel(state, lesson)}</p><div className='grid stat-grid'><div className='card stat-card'><h2>{present.length}</h2><p className='muted'>Present</p></div><div className='card stat-card'><h2>{complete.length}</h2><p className='muted'>Completed group criteria</p></div><div className='card stat-card'><h2>{groupCriteria(state, lesson).length}</h2><p className='muted'>Criteria assessed</p></div></div></section>
    <section className='card'><h2>Group summary</h2>{present.map(p => <div className='folder' key={p.id}>{p.name}: {completionText(state, lesson, p)}</div>)}</section>
    <div className='footer'><button className='btn' onClick={() => update({ step: 'assess' })}>Back to assessment</button><button className='btn org' onClick={() => update({ step: 'list', active: '' })}>Finish</button></div>
  </>;
}

function HealthCheck({ state, update }) {
  const items = useMemo(() => getHealthItems(state), [state]);
  const done = items.filter(item => item.done).length;
  const failed = items.filter(item => !item.done);
  const percent = Math.round((done / items.length) * 100);
  const testSteps = ['Open Home', 'Open Timetable', 'Create or edit a group lesson', 'Choose an assessment group', 'Paste swimmers', 'Complete register', 'Assess by swimmer', 'Assess by skill', 'Save lesson', 'Open Reports', 'Open Settings'];
  return <><section className='hero'><p>Priority 1</p><h1>Stability health check</h1><p>{percent}% of automatic checks are passing.</p></section><div className='grid'><div className='card'><h2>{percent}%</h2><p className='muted'>Automatic stability score</p></div><div className='card'><h2>{done}/{items.length}</h2><p className='muted'>Checks passing</p></div><div className='card'><h2>{state.audit?.length || 0}</h2><p className='muted'>Audit entries</p></div></div><section className='card'><h2>{failed.length ? 'Needs checks' : 'Ready for manual sign-off'}</h2><p className='muted'>{failed.length ? 'Fix the warnings below before moving on.' : 'Run the manual test route once on your phone.'}</p></section><section className='card'><h2>✅ Passed</h2>{items.filter(item => item.done).map(item => <div className='folder' key={item.label}>✅ {item.label}<p className='muted'>{item.detail}</p></div>)}</section><section className='card'><h2>⚠️ Needs fixing</h2>{failed.length ? failed.map(item => <div className='folder' key={item.label}>⚠️ {item.label}<p className='muted'>{item.detail}</p></div>) : <div className='folder'>✅ Nothing currently flagged.</div>}</section><section className='card'><h2>Manual live test route</h2>{testSteps.map((step, index) => <div className='folder' key={step}>#{index + 1} {step}</div>)}</section><div className='footer'><button className='btn' onClick={() => { clearAppState(); location.reload(); }}>Reset app data</button><button className='btn org' onClick={() => update({ screen: 'timetable', step: 'list' })}>Test timetable</button></div></>;
}
function getHealthItems(state) {
  const activeExists = !state.active || state.lessons.some(l => l.id === state.active);
  const everyLessonHasGroup = state.lessons.every(l => !!l.groupTemplateId);
  return [
    { label: 'App state loads', done: !!state && typeof state === 'object', detail: 'React has loaded a usable state object.' },
    { label: 'Lessons are available', done: Array.isArray(state.lessons), detail: `${state.lessons?.length || 0} lesson(s) loaded.` },
    { label: 'Lessons use groups', done: everyLessonHasGroup, detail: 'Every lesson has an assessment group.' },
    { label: 'Group templates exist', done: groups(state).length > 0, detail: `${groups(state).length} group template(s) available.` },
    { label: 'Group criteria can be calculated', done: state.lessons.every(l => l.mode === 'National Curriculum only' || groupCriteria(state, l).length > 0), detail: 'Lesson criteria comes from the selected group.' },
    { label: 'Learner data is safe', done: Array.isArray(state.learners) && state.learners.every(p => p.id && p.name && p.lesson && p.att), detail: `${state.learners?.length || 0} swimmer(s) loaded.` },
    { label: 'Active lesson is valid', done: activeExists, detail: activeExists ? 'The selected lesson exists or none is selected.' : 'Selected lesson is missing.' },
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
  return <><section className='hero'><h1>Progress Overview</h1><p>See each group session, how many criteria are being assessed, and who is nearly complete.</p></section><div className='grid2'>{lessons.map(({ lesson, swimmers, criteria, complete }) => <section className='card' key={lesson.id}><h2>{lesson.name}</h2><p className='muted'>{groupLabel(state, lesson)}</p><span className='pill'>{swimmers.length} swimmers</span><span className='pill'>{criteria.length} criteria</span><span className='pill'>{complete} complete</span>{swimmers.map(p => <div className='folder' key={p.id}>{p.name}: {completionText(state, lesson, p)}</div>)}</section>)}</div><section className='card'><h2>End-of-term pack</h2><p className='muted'>This will later become the printable/export pack. For now, it is showing live progress from group criteria.</p><button className='btn org' onClick={() => update({ audit: [`Progress pack checked`, ...(state.audit || [])] })}>Log pack check</button></section></>;
}

function Settings({ state, update }) {
  const tabs = ['groups', 'framework', 'certificates', 'permissions', 'audit'];
  return <><section className='hero'><h1>Settings</h1><p>Set the groups first. Lessons then assess swimmers against those group criteria.</p></section><div className='tabs'>{tabs.map(t => <button key={t} className={(state.tab || 'groups') === t ? 'on' : ''} onClick={() => update({ tab: t })}>{t}</button>)}</div>{(state.tab || 'groups') === 'groups' && <Groups state={state} update={update} />}{state.tab === 'framework' && <Framework state={state} update={update} />}{state.tab === 'certificates' && <Certificates state={state} update={update} />}{state.tab === 'permissions' && <Permissions state={state} update={update} />}{state.tab === 'audit' && <section className='card'><h2>Audit log</h2>{(state.audit || []).map((a, i) => <p key={i}>• {a}</p>)}</section>}</>;
}

function Groups({ state, update }) {
  function edit(i, key, value) {
    const groupTemplates = [...groups(state)];
    groupTemplates[i] = { ...groupTemplates[i], [key]: value };
    update({ framework: { ...state.framework, groupTemplates, groups: groupTemplates.map(g => `${g.name}: ${g.detail || ''}`) } });
  }
  function addGroup() {
    const groupTemplates = [...groups(state), { id: 'g' + Date.now(), name: 'New Group', detail: 'Choose stages/criteria', stages: [], colour: 'blue' }];
    update({ framework: { ...state.framework, groupTemplates, groups: groupTemplates.map(g => `${g.name}: ${g.detail || ''}`) } });
  }
  return <section className='card'><h2>Assessment groups</h2><p className='muted'>These groups decide what criteria appears in lessons. Swimmers do not need a separate initial assessment.</p><button className='btn org' onClick={addGroup}>+ Add assessment group</button>{groups(state).map((g, i) => <div className='card' key={g.id}><Field label='Group name' value={g.name} onChange={v => edit(i, 'name', v)} /><Field label='Group detail' value={g.detail || ''} onChange={v => edit(i, 'detail', v)} /><h3>Criteria sections included</h3><div>{state.framework.stages.map(stage => <label className='pill' key={stage}><input type='checkbox' checked={g.stages?.includes(stage)} onChange={e => { const next = e.target.checked ? [...(g.stages || []), stage] : (g.stages || []).filter(x => x !== stage); edit(i, 'stages', next); }} /> {stage}</label>)}</div><p className='muted'>{(g.stages || []).flatMap(stage => criteriaForStage(state, stage)).length} criteria in this group.</p></div>)}</section>;
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
    update({ certificates: [...state.certificates, { id: 'cert' + Date.now(), name: 'New Certificate Template', rule: 'Group criteria complete', font: 'Serif', size: 32, groupBy: 'Assessment group' }] });
  }
  return <section className='card'><h2>Certificate templates</h2><p className='muted'>Certificate generation is still demo-level, but it now points at group completion rather than initial placement.</p><button className='btn org' onClick={addCert}>+ Add certificate template</button>{state.certificates.map(c => <div className='card' key={c.id}><Field label='Name' value={c.name} onChange={v => update({ certificates: state.certificates.map(x => x.id === c.id ? { ...x, name: v } : x) })} /><Select label='Rule' value={c.rule} onChange={v => update({ certificates: state.certificates.map(x => x.id === c.id ? { ...x, rule: v } : x) })} options={['Group criteria complete', 'National Curriculum achieved', 'Selected award only'].map(x => ({ value: x, label: x }))} /><Select label='Group by' value={c.groupBy} onChange={v => update({ certificates: state.certificates.map(x => x.id === c.id ? { ...x, groupBy: v } : x) })} options={['Assessment group', 'School / venue', 'Award', 'All in one PDF'].map(x => ({ value: x, label: x }))} /></div>)}</section>;
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
