import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';
import './styles/calendar-overlay.css';
import { demoFramework, demoLearners, demoLessons, nationalCurriculum, stageCriteria, programmeAreas } from './data/demoData.js';
import { loadAppState, saveAppState, clearAppState } from './lib/localStore.js';

function timeToMinutes(time) { const [h, m] = String(time || '00:00').split(':').map(Number); return ((Number.isFinite(h) ? h : 0) * 60) + (Number.isFinite(m) ? m : 0); }
function formatTime(total) { const hh = String(Math.floor(total / 60)).padStart(2, '0'); const mm = String(total % 60).padStart(2, '0'); return `${hh}:${mm}`; }
function makeTimeSlots(start = '08:00', end = '21:00', step = 15) { const slots = []; for (let t = timeToMinutes(start); t <= timeToMinutes(end); t += step) slots.push(formatTime(t)); return slots; }

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const timeSlots = makeTimeSlots('08:00', '21:00', 15);
const durations = [15, 30, 45, 60, 75, 90, 105, 120];
const modes = ['Stages + National Curriculum', 'National Curriculum only'];
const attendanceOptions = ['Present', 'Absent', 'Late', 'Not Taking Part'];
const scores = ['no', 'float', 'pass'];
const distances = ['0m', '5m', '10m', '15m', '20m', '25m', '50m', '100m'];
const programmeFilters = ['All', ...(programmeAreas || ['School Swimming', 'Evening Swim Lessons', 'Private Lessons', 'School PE', 'Gymnastics', 'Custom'])];

const starter = {
  screen: 'home',
  step: 'list',
  tab: 'framework',
  selected: '',
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
  audit: ['Overlay calendar and overlap blocking added']
};

function lessonDay(lesson) { return lesson?.day || 'Tuesday'; }
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function groups(state) { return state.framework?.groupTemplates || []; }
function groupFor(state, id) { return groups(state).find(g => g.id === id); }
function addMinutes(time, minutes) { return formatTime(timeToMinutes(time) + (Number(minutes) || 0)); }
function lessonInterval(lesson) { const start = timeToMinutes(lesson.time); const end = start + (Number(lesson.duration) || 30); return { start, end }; }
function lessonOverlaps(lessons, candidate, ignoreId = '') {
  const a = lessonInterval(candidate);
  return lessons.some(existing => {
    if (existing.id === ignoreId || lessonDay(existing) !== lessonDay(candidate)) return false;
    const b = lessonInterval(existing);
    return a.start < b.end && a.end > b.start;
  });
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
function visibleLessonsForDay(state, day) {
  const filter = state.timetableFilter || 'All';
  return [...state.lessons].filter(l => lessonDay(l) === day && (filter === 'All' || lessonProgramme(l) === filter));
}
function defaultSchoolForProgramme(programme) { return programme === 'Evening Swim Lessons' ? 'Evening Swim Lessons' : programme === 'Private Lessons' ? 'Private Client' : 'New School'; }
function firstStageForGroup(state, groupId) {
  const group = groupFor(state, groupId);
  return group?.stages?.[0] || state.framework?.stages?.[0] || 'Stage 1';
}
function createLearnersFromText(text, lessonId, stage) {
  return (text || '').split('\n').map(x => x.trim()).filter(Boolean).map((name, index) => ({
    id: 'p' + Date.now() + index,
    lesson: lessonId,
    name,
    stage,
    att: 'Present',
    res: {},
    dist: { front: '0m', back: '0m' },
    nc: {}
  }));
}
function distanceNumber(value) { return parseInt(String(value || '0').replace('m', ''), 10) || 0; }
function allCriteria(state) { return Object.values(state.framework?.criteria || stageCriteria || {}).flat(); }
function criteriaDistanceMatch(criteria, stroke, metres) {
  const text = criteria.toLowerCase();
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
  allCriteria(state).forEach(criteria => { if (criteriaDistanceMatch(criteria, stroke, metres)) next[criteria] = 'pass'; });
  return next;
}
function getDistanceFromCriteria(criteria) {
  const text = criteria.toLowerCase();
  const match = text.match(/(\d+)\s*m/);
  if (!match) return null;
  if (text.includes('front') || text.includes('crawl')) return { stroke: 'front', metres: Number(match[1]) };
  if (text.includes('back') || text.includes('backstroke')) return { stroke: 'back', metres: Number(match[1]) };
  if (text.includes('choice of stroke') || text.includes('optional') || text.includes('distance achieved')) return { stroke: 'front', metres: Number(match[1]) };
  return null;
}
function stageSortValue(stage) { const match = String(stage || '').match(/Stage\s*(\d+)/i); if (match) return Number(match[1]); if (String(stage).toLowerCase().includes('self rescue')) return 900; return 800; }
function stageIndex(state, stage) { return (state.framework?.stages || []).indexOf(stage); }
function criteriaBeforeStage(state, stage) {
  const stages = state.framework?.stages || [];
  const target = stageIndex(state, stage);
  if (target <= 0) return [];
  return stages.slice(0, target).flatMap(s => state.framework?.criteria?.[s] || stageCriteria[s] || []);
}
function applyStageAutoPass(state, currentResults, nextStage) {
  const next = { ...(currentResults || {}) };
  criteriaBeforeStage(state, nextStage).forEach(criteria => { next[criteria] = 'pass'; });
  return next;
}
function moveLearnerToGroupStage(state, learner, groupId) {
  const nextStage = firstStageForGroup(state, groupId);
  const movedUp = stageIndex(state, nextStage) > stageIndex(state, learner.stage);
  return { ...learner, stage: nextStage, res: movedUp ? applyStageAutoPass(state, learner.res, nextStage) : learner.res };
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
    <div className='top'><div className='brand'>StageFlow</div><button className='btn' onClick={() => { clearAppState(); location.reload(); }}>Reset</button></div>
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
  return <>
    <section className='hero'><p>StageFlow MVP</p><h1>Today starts from the timetable.</h1><p>Open the lesson, register, assess, save, export.</p></section>
    {next ? <section className='card lesson'><div className='time'>{next.time}</div><div><h2>{next.name}</h2><p className='muted'>{lessonDay(next)} · {lessonProgramme(next)} · {next.school} · {next.year}</p><span className='pill'>{groupFor(state, next.groupTemplateId)?.name || 'No group template'}</span><span className='pill'>{next.time}–{addMinutes(next.time, next.duration || 30)}</span><span className='pill'>Register → Assess → Save</span></div><button className='btn org' onClick={() => update({ screen: 'timetable', active: next.id, step: 'register' })}>Open lesson</button></section> : <section className='card'><h2>No lessons yet</h2><p className='muted'>Go to Timetable and create your first session.</p></section>}
    <div className='grid'><div className='card'><h2>{state.lessons.length}</h2><p className='muted'>Lessons</p></div><div className='card'><h2>{state.learners.length}</h2><p className='muted'>Learners</p></div><div className='card'><h2>{ncDone}</h2><p className='muted'>NC achieved</p></div></div>
    <section className='card'><h2>Priority 1 stability</h2><p className='muted'>{percent}% checked inside the app</p><button className='btn org' onClick={() => update({ screen: 'health' })}>Open health check</button></section>
  </>;
}

function Timetable({ state, update }) {
  const day = state.currentDay || 'Tuesday';
  const filter = state.timetableFilter || 'All';
  const templateOptions = groups(state);
  const sorted = visibleLessonsForDay(state, day).sort((a, b) => String(a.time).localeCompare(String(b.time)));
  const dayCounts = days.reduce((acc, d) => ({ ...acc, [d]: visibleLessonsForDay(state, d).length }), {});
  function setDay(nextDay) { update({ currentDay: nextDay, draft: null }); }
  function setFilter(nextFilter) { update({ timetableFilter: nextFilter, draft: null }); }
  function openDraft(time) { const first = templateOptions[0]?.id || ''; const programme = filter === 'All' ? (state.framework.area || 'School Swimming') : filter; update({ draft: { day, time, duration: 30, programme, school: defaultSchoolForProgramme(programme), year: 'Year 5', className: '', coach: '', name: 'New Lesson', groupTemplateId: first, pastedNames: '', mode: state.framework.mode } }); }
  function draft(key, value) { update({ draft: { ...state.draft, [key]: value, ...(key === 'programme' ? { school: defaultSchoolForProgramme(value) } : {}) } }); }
  function createLesson() { if (!state.draft) return; const id = 'l' + Date.now(); const stage = firstStageForGroup(state, state.draft.groupTemplateId); const newLearners = createLearnersFromText(state.draft.pastedNames, id, stage); const lesson = { ...state.draft }; delete lesson.pastedNames; const candidate = { id, ...lesson }; if (lessonOverlaps(state.lessons, candidate, id)) { alert('This lesson would overlap another lesson. Choose a different time or shorter duration.'); return; } update({ lessons: [...state.lessons, candidate], learners: [...state.learners, ...newLearners], active: id, draft: null, audit: [`Created ${state.draft.name} with ${newLearners.length} learner(s)`, ...state.audit] }); }
  function edit(id, key, value) {
    const existing = state.lessons.find(l => l.id === id);
    const candidate = { ...existing, [key]: value };
    if (['day', 'time', 'duration'].includes(key) && lessonOverlaps(state.lessons, candidate, id)) { alert('That would overlap the next lesson. Adjust the time or duration first.'); return; }
    if (key === 'groupTemplateId') {
      const groupName = groupFor(state, value)?.name || 'new group';
      update({ lessons: state.lessons.map(l => l.id === id ? { ...l, groupTemplateId: value } : l), learners: state.learners.map(p => p.lesson === id ? moveLearnerToGroupStage(state, p, value) : p), audit: [`Moved lesson to ${groupName} and updated learner stages`, ...state.audit] });
      return;
    }
    update({ lessons: state.lessons.map(l => l.id === id ? { ...l, [key]: value } : l) });
  }
  function move(id, slots) { const lesson = state.lessons.find(l => l.id === id); const i = timeSlots.indexOf(lesson?.time); edit(id, 'time', timeSlots[clamp(i + slots, 0, timeSlots.length - 1)] || lesson?.time || '09:00'); }
  function resize(id, delta) { const lesson = state.lessons.find(l => l.id === id); edit(id, 'duration', clamp((Number(lesson?.duration) || 30) + delta, 15, 120)); }
  function duplicate(lesson) { const id = 'l' + Date.now(); const copy = { ...lesson, id, name: lesson.name + ' copy' }; if (lessonOverlaps(state.lessons, copy, id)) { alert('The copied lesson would overlap another lesson. Move the original or change the time first.'); return; } update({ lessons: [...state.lessons, copy], audit: [`Duplicated ${lesson.name}`, ...state.audit] }); }
  function removeLesson(id) { const lesson = state.lessons.find(l => l.id === id); update({ lessons: state.lessons.filter(l => l.id !== id), learners: state.learners.filter(p => p.lesson !== id), audit: [`Deleted ${lesson?.name || 'lesson'}`, ...state.audit] }); }
  return <>
    <section className='hero'><h1>Master timetable</h1><p>Keep everything in one calendar, then filter by programme when you need a cleaner view.</p></section>
    <div className='tabs'>{days.map(d => <button key={d} className={day === d ? 'on' : ''} onClick={() => setDay(d)}>{d} <span className='pill'>{dayCounts[d]}</span></button>)}</div>
    <section className='card'><h2>Calendar filter</h2><p className='muted'>Use All as your working diary. Use a programme filter when you only want school swimming, evening lessons or private lessons.</p><div className='tabs'>{programmeFilters.map(p => <button key={p} className={filter === p ? 'on' : ''} onClick={() => setFilter(p)}>{p}</button>)}</div></section>
    <div className='calendar-toolbar card'><div><h2>{filter === 'All' ? `${day} master calendar` : `${day} · ${filter}`}</h2><p className='muted'>Lesson cards span across the fixed time grid. Overlaps are blocked.</p></div><button className='btn org' onClick={() => openDraft('08:00')}>+ Create lesson</button></div>
    {state.draft && <section className='card draft-panel'><h2>Create lesson on {state.draft.day} at {state.draft.time}</h2><div className='grid'><Select label='Programme' value={state.draft.programme || 'School Swimming'} onChange={v => draft('programme', v)} options={(programmeAreas || []).map(x => ({ value: x, label: x }))} /><Field label='Lesson name' value={state.draft.name} onChange={v => draft('name', v)} /><Field label='School / Venue' value={state.draft.school} onChange={v => draft('school', v)} /><Field label='Year / Class' value={state.draft.year} onChange={v => draft('year', v)} /><Field label='Class / SEN' value={state.draft.className} onChange={v => draft('className', v)} /><Field label='Coach' value={state.draft.coach} onChange={v => draft('coach', v)} /><Select label='Group template' value={state.draft.groupTemplateId || ''} onChange={v => draft('groupTemplateId', v)} options={templateOptions.map(g => ({ value: g.id, label: `${g.name} · ${g.detail}` }))} /><Select label='Duration' value={state.draft.duration} onChange={v => draft('duration', Number(v))} options={durations.map(x => ({ value: x, label: `${x} mins` }))} /><Select label='Mode' value={state.draft.mode} onChange={v => draft('mode', v)} options={modes.map(x => ({ value: x, label: x }))} /></div><div className='field'><label>Paste learners into this lesson</label><textarea value={state.draft.pastedNames || ''} onChange={e => draft('pastedNames', e.target.value)} placeholder={'Derek Jones\nMia Smith\nAlex Patel'} /></div><div className='event-actions'><button className='btn org' onClick={createLesson}>Create lesson</button><button className='btn' onClick={() => update({ draft: null })}>Cancel</button></div></section>}
    <section className='calendar-shell'>{timeSlots.map(t => { const items = sorted.filter(l => l.time === t); return <div className='calendar-row' key={t}><button className='calendar-time' onClick={() => openDraft(t)}>{t}</button><div className='calendar-slot' onClick={() => !items.length && openDraft(t)}>{items.length === 0 && <span className='empty-slot'>Tap to add lesson</span>}{items.map(l => <CalendarEvent key={l.id} state={state} lesson={l} open={() => update({ active: l.id, step: 'register' })} move={move} resize={resize} duplicate={duplicate} remove={removeLesson} />)}</div></div>; })}</section>
    {sorted.length === 0 && <section className='card'><h2>No lessons on {day} for {filter}</h2><p className='muted'>Switch to All, pick another programme, or add a new lesson.</p></section>}
    <section className='card'><h2>Edit {filter === 'All' ? day + ' sessions' : filter + ' sessions'}</h2><div className='grid'>{sorted.map(l => <LessonEditCard key={l.id} state={state} lesson={l} edit={edit} templateOptions={templateOptions} />)}</div></section>
  </>;
}

function CalendarEvent({ state, lesson, open, move, resize, duplicate, remove }) {
  const endTime = addMinutes(lesson.time, lesson.duration || 30);
  const blockHeight = Math.max(44, ((Number(lesson.duration) || 30) / 15) * 50 - 12);
  return <div className='calendar-event' style={{ height: blockHeight }} onClick={e => e.stopPropagation()}><div className='event-head'><strong>{lesson.name}</strong><button className='btn' onClick={open}>Open</button></div><p>{lesson.school} · {lesson.year}{lesson.className ? ` · ${lesson.className}` : ''}</p><span className='pill'>{lessonProgramme(lesson)}</span><span className='pill'>{lesson.time}–{endTime}</span><span className='pill'>{groupFor(state, lesson.groupTemplateId)?.name || 'No template'}</span><span className='pill'>{lesson.duration || 30} mins</span><div className='event-actions'><button className='btn' onClick={() => move(lesson.id, -1)}>↑ 15</button><button className='btn' onClick={() => move(lesson.id, 1)}>↓ 15</button><button className='btn' onClick={() => resize(lesson.id, -15)}>-15m</button><button className='btn' onClick={() => resize(lesson.id, 15)}>+15m</button><button className='btn' onClick={() => duplicate(lesson)}>Duplicate</button><button className='btn' onClick={() => remove(lesson.id)}>Delete</button></div></div>;
}
function LessonEditCard({ state, lesson, edit, templateOptions }) {
  return <div className='card'><h3>{lesson.time} · {lesson.name}</h3><Select label='Programme' value={lessonProgramme(lesson)} onChange={v => edit(lesson.id, 'programme', v)} options={(programmeAreas || []).map(x => ({ value: x, label: x }))} /><Select label='Day' value={lessonDay(lesson)} onChange={v => edit(lesson.id, 'day', v)} options={days.map(d => ({ value: d, label: d }))} /><Select label='Time' value={lesson.time} onChange={v => edit(lesson.id, 'time', v)} options={timeSlots.map(x => ({ value: x, label: x }))} /><Select label='Group template' value={lesson.groupTemplateId || ''} onChange={v => edit(lesson.id, 'groupTemplateId', v)} options={templateOptions.map(g => ({ value: g.id, label: `${g.name} · ${g.detail}` }))} /><Select label='Duration' value={lesson.duration || 30} onChange={v => edit(lesson.id, 'duration', Number(v))} options={durations.map(x => ({ value: x, label: `${x} mins` }))} /><Field label='School / Venue' value={lesson.school} onChange={v => edit(lesson.id, 'school', v)} /><Field label='Year / Class' value={lesson.year} onChange={v => edit(lesson.id, 'year', v)} /><Field label='Lesson name' value={lesson.name} onChange={v => edit(lesson.id, 'name', v)} /><Field label='Coach' value={lesson.coach || ''} onChange={v => edit(lesson.id, 'coach', v)} /><Field label='Class / SEN' value={lesson.className || ''} onChange={v => edit(lesson.id, 'className', v)} /><Select label='Mode' value={lesson.mode} onChange={v => edit(lesson.id, 'mode', v)} options={modes.map(x => ({ value: x, label: x }))} /></div>;
}

function Lesson({ state, update, lesson }) {
  const kids = state.learners.filter(p => p.lesson === lesson.id);
  const present = kids.filter(p => p.att !== 'Absent');
  const selected = kids.find(p => p.id === state.selected) || present[0];
  return <>
    <section className='hero'><p>{lessonDay(lesson)} · {lesson.time} · {lessonProgramme(lesson)} · {lesson.school}</p><h1>{lesson.name}</h1><p>{groupFor(state, lesson.groupTemplateId)?.name || 'No group template'} · {lesson.mode}</p><div className='steps'><span className={state.step === 'register' ? 'on' : ''}>1 Register</span><span className={state.step === 'assess' ? 'on' : ''}>2 Assess</span><span className={state.step === 'save' ? 'on' : ''}>3 Save</span></div></section>
    {state.step === 'register' && <Register state={state} update={update} lesson={lesson} kids={kids} />}
    {state.step === 'assess' && (selected ? <Assess state={state} update={update} lesson={lesson} kids={present} selected={selected} /> : <section className='card'><h2>No present learners</h2><p className='muted'>Go back to the register and add or mark learners present.</p><button className='btn org' onClick={() => update({ step: 'register' })}>Back to register</button></section>)}
    {state.step === 'save' && <><section className='card'><h2>Lesson saved</h2><p>{present.length} present / late</p></section><div className='footer'><button className='btn' onClick={() => update({ step: 'assess' })}>Make changes</button><button className='btn org' onClick={() => update({ step: 'list', screen: 'timetable', audit: ['Saved lesson', ...state.audit] })}>Finish</button></div></>}
  </>;
}
function Register({ state, update, lesson, kids }) {
  function add() { const text = document.getElementById('names')?.value || ''; const newLearners = createLearnersFromText(text, lesson.id, firstStageForGroup(state, lesson.groupTemplateId)); update({ learners: [...state.learners, ...newLearners], audit: [`Added ${newLearners.length} learner(s)`, ...state.audit] }); }
  function attendance(id, value) { update({ learners: state.learners.map(p => p.id === id ? { ...p, att: value } : p) }); }
  return <><section className='card'><h2>Register</h2><p className='muted'>Paste names one per line for any children missing from this lesson.</p><textarea id='names' placeholder={'Derek Jones\nMia Smith'} /><button className='btn' onClick={add}>Add names</button></section>{kids.length === 0 && <section className='card'><h2>No learners yet</h2><p className='muted'>Paste names above to create this register.</p></section>}{kids.map(p => <section className='card' key={p.id}><h3>{p.name}</h3>{attendanceOptions.map(v => <button className={'btn ' + (p.att === v ? 'org' : '')} key={v} onClick={() => attendance(p.id, v)}>{v}</button>)}</section>)}<div className='footer'><button className='btn org' onClick={() => update({ step: 'assess', selected: kids.find(p => p.att !== 'Absent')?.id || '' })}>Confirm register & assess</button></div></>;
}

function Assess({ state, update, lesson, kids, selected }) {
  function change(patch) { update({ learners: state.learners.map(p => p.id === selected.id ? { ...p, ...patch } : p) }); }
  function setDistance(stroke, value) {
    const metres = distanceNumber(value);
    const ncKey = stroke === 'front' ? '25m front crawl' : '25m backstroke';
    change({ dist: { ...selected.dist, [stroke]: value }, res: applyDistanceAutoPass(state, selected.res, stroke, metres), nc: { ...selected.nc, [ncKey]: metres >= 25 } });
  }
  function setStage(nextStage) {
    const movedUp = stageIndex(state, nextStage) > stageIndex(state, selected.stage);
    change({ stage: nextStage, res: movedUp ? applyStageAutoPass(state, selected.res, nextStage) : selected.res });
  }
  function score(criteria, value) {
    const distance = getDistanceFromCriteria(criteria);
    if (value === 'pass' && distance) {
      const current = distanceNumber(selected.dist?.[distance.stroke]);
      const metres = Math.max(current, distance.metres);
      const valueText = `${metres}m`;
      const ncKey = distance.stroke === 'front' ? '25m front crawl' : '25m backstroke';
      change({ dist: { ...selected.dist, [distance.stroke]: valueText }, res: applyDistanceAutoPass(state, { ...selected.res, [criteria]: value }, distance.stroke, metres), nc: { ...selected.nc, [ncKey]: metres >= 25 } });
    } else {
      change({ res: { ...selected.res, [criteria]: value } });
    }
  }
  const stageOptions = [...(state.framework?.stages || [])].sort((a, b) => stageSortValue(a) - stageSortValue(b));
  const criteria = lesson.mode === 'National Curriculum only' ? [] : (state.framework.criteria?.[selected.stage] || stageCriteria[selected.stage] || []);
  return <><div className='grid2'><section className='card'>{kids.map(p => <button className={'btn ' + (p.id === selected.id ? 'org' : '')} key={p.id} onClick={() => update({ selected: p.id })}>{p.name}</button>)}</section><section className='card'><h2>{selected.name}</h2>{lesson.mode !== 'National Curriculum only' && <><Select label='Current working stage' value={selected.stage} onChange={setStage} options={stageOptions.map(x => ({ value: x, label: x }))} /><p className='muted'>You can move a learner freely. Moving up auto-passes all earlier stage criteria, but moving down does not erase evidence.</p></>}<div className='grid2'><Distance label='Distance front' value={selected.dist.front} onChange={v => setDistance('front', v)} /><Distance label='Distance back' value={selected.dist.back} onChange={v => setDistance('back', v)} /></div><p className='muted'>Distance auto-pass: choosing 15m also passes matching 5m and 10m skills for that stroke.</p>{criteria.map(c => <div className='criteria' key={c}><b>{c}</b><div>{scores.map(v => <button className={'btn ' + (selected.res[c] === v ? 'org' : '')} key={v} onClick={() => score(c, v)}>{v}</button>)}</div></div>)}<h3>National Curriculum</h3>{nationalCurriculum.map(item => <label className='pill' key={item}><input type='checkbox' checked={!!selected.nc[item]} onChange={e => change({ nc: { ...selected.nc, [item]: e.target.checked } })} /> {item}</label>)}</section></div><div className='footer'><button className='btn' onClick={() => update({ step: 'register' })}>Back</button><button className='btn org' onClick={() => update({ step: 'save' })}>Save lesson</button></div></>;
}

function HealthCheck({ state, update }) {
  const items = useMemo(() => getHealthItems(state), [state]);
  const done = items.filter(item => item.done).length;
  const failed = items.filter(item => !item.done);
  const percent = Math.round((done / items.length) * 100);
  const testSteps = ['Load app without blank screen', 'Reset app', 'Open Home', 'Open Timetable', 'Switch Monday-Friday tabs', 'Create lesson from time slot', 'Paste learners into lesson', 'Open lesson', 'Complete register', 'Assess a learner', 'Save lesson', 'Open Reports', 'Open Settings'];
  return <><section className='hero'><p>Priority 1</p><h1>Stability health check</h1><p>{percent}% of automatic checks are passing.</p></section><div className='grid'><div className='card'><h2>{percent}%</h2><p className='muted'>Automatic stability score</p></div><div className='card'><h2>{done}/{items.length}</h2><p className='muted'>Checks passing</p></div><div className='card'><h2>{state.audit.length}</h2><p className='muted'>Audit entries</p></div></div><section className='card'><h2>{failed.length ? 'Priority 1 needs checks' : 'Priority 1 ready for manual sign-off'}</h2><p className='muted'>{failed.length ? 'Fix the warnings below before moving on.' : 'Run the manual test route once on your phone, then move to Priority 2.'}</p></section><section className='card'><h2>✅ Passed</h2>{items.filter(item => item.done).map(item => <div className='folder' key={item.label}>✅ {item.label}<p className='muted'>{item.detail}</p></div>)}</section><section className='card'><h2>⚠️ Needs fixing</h2>{failed.length ? failed.map(item => <div className='folder' key={item.label}>⚠️ {item.label}<p className='muted'>{item.detail}</p></div>) : <div className='folder'>✅ Nothing currently flagged.</div>}</section><section className='card'><h2>Manual live test route</h2><p className='muted'>Use this after Vercel redeploys. If every step works, Priority 1 is effectively complete.</p>{testSteps.map((step, index) => <div className='folder' key={step}>#{index + 1} {step}</div>)}</section><div className='footer'><button className='btn' onClick={() => { clearAppState(); location.reload(); }}>Reset app data</button><button className='btn org' onClick={() => update({ screen: 'timetable', step: 'list' })}>Test timetable</button></div></>;
}
function getHealthItems(state) {
  const activeExists = !state.active || state.lessons.some(l => l.id === state.active);
  return [
    { label: 'App state loads', done: !!state && typeof state === 'object', detail: 'React has loaded a usable state object.' },
    { label: 'Lessons are available', done: Array.isArray(state.lessons), detail: `${state.lessons?.length || 0} lesson(s) currently loaded.` },
    { label: 'Lesson fields are safe', done: state.lessons.every(l => l.id && l.day && l.time && l.name && l.duration), detail: 'Every lesson has id, day, time, name and duration.' },
    { label: 'Weekly day tabs are valid', done: days.includes(state.currentDay || 'Tuesday'), detail: `Selected day is ${state.currentDay || 'Tuesday'}.` },
    { label: 'Programme filter is valid', done: programmeFilters.includes(state.timetableFilter || 'All'), detail: `Calendar filter is ${state.timetableFilter || 'All'}.` },
    { label: 'Framework stages exist', done: Array.isArray(state.framework?.stages) && state.framework.stages.length > 0, detail: `${state.framework?.stages?.length || 0} stage(s) available.` },
    { label: 'Group templates exist', done: groups(state).length > 0, detail: `${groups(state).length} group template(s) available.` },
    { label: 'Learner data is safe', done: Array.isArray(state.learners) && state.learners.every(p => p.id && p.name && p.lesson && p.stage && p.att), detail: `${state.learners?.length || 0} learner(s) currently loaded.` },
    { label: 'Active lesson is valid', done: activeExists, detail: activeExists ? 'The selected lesson exists or none is selected.' : 'Selected lesson is missing.' },
    { label: 'National Curriculum items exist', done: nationalCurriculum.length >= 4, detail: `${nationalCurriculum.length} NC item(s) available.` },
    { label: 'Reports pack state exists', done: !!state.pack && typeof state.pack === 'object', detail: 'End-of-term pack settings are present.' },
    { label: 'Settings data exists', done: Array.isArray(state.staff) && Array.isArray(state.certificates), detail: 'Staff permissions and certificate template data are present.' },
    { label: 'Audit log exists', done: Array.isArray(state.audit), detail: `${state.audit?.length || 0} audit item(s) currently saved.` }
  ];
}

function Reports({ state, update }) { return <><section className='hero'><h1>End-of-Term Pack</h1><p>One downloadable pack with reports, certificates, registers and summaries.</p></section><div className='grid2'><section className='card'><h2>Pack options</h2>{Object.keys(state.pack).filter(k => typeof state.pack[k] === 'boolean').map(k => <label className='pill' key={k}><input type='checkbox' checked={state.pack[k]} onChange={e => update({ pack: { ...state.pack, [k]: e.target.checked } })} /> {k}</label>)}<Field label='Send to' value={state.pack.email} onChange={v => update({ pack: { ...state.pack, email: v } })} /><Field label='CC' value={state.pack.cc} onChange={v => update({ pack: { ...state.pack, cc: v } })} /><Select label='Delivery method' value={state.pack.method} onChange={v => update({ pack: { ...state.pack, method: v } })} options={['Secure download link', 'Email attachment', 'Download only'].map(x => ({ value: x, label: x }))} /><button className='btn org' onClick={() => update({ audit: [`Pack queued for ${state.pack.email}`, ...state.audit] })}>Queue send demo</button></section><section className='card'><h2>School Handover Pack.zip</h2>{Object.keys(state.pack).filter(k => state.pack[k] === true).map(k => <div className='folder' key={k}>📁 {k}</div>)}</section></div></>; }
function Settings({ state, update }) { return <><section className='hero'><h1>Settings</h1><p>Frameworks, group templates, certificates, permissions and audit log.</p></section><div className='tabs'>{['framework', 'groups', 'certificates', 'permissions', 'audit'].map(t => <button key={t} className={state.tab === t ? 'on' : ''} onClick={() => update({ tab: t })}>{t}</button>)}</div>{(state.tab || 'framework') === 'framework' && <Framework state={state} update={update} />}{state.tab === 'groups' && <Groups state={state} update={update} />}{state.tab === 'certificates' && <Certificates state={state} update={update} />}{state.tab === 'permissions' && <Permissions state={state} update={update} />}{state.tab === 'audit' && <section className='card'><h2>Audit log</h2>{state.audit.map((a, i) => <p key={i}>• {a}</p>)}</section>}</>; }
function Framework({ state, update }) { function setCriteria(stage, text) { update({ framework: { ...state.framework, criteria: { ...state.framework.criteria, [stage]: text.split('\n').map(x => x.trim()).filter(Boolean) } } }); } function addStage() { const name = 'New Stage ' + (state.framework.stages.length + 1); update({ framework: { ...state.framework, stages: [...state.framework.stages, name], criteria: { ...state.framework.criteria, [name]: [] } } }); } return <section className='card'><h2>Assessment Framework</h2><Field label='Name' value={state.framework.name} onChange={v => update({ framework: { ...state.framework, name: v } })} /><button className='btn org' onClick={addStage}>+ Add stage/section</button><h3>Stages and criteria</h3>{state.framework.stages.map(stage => <div className='card' key={stage}><h3>{stage}</h3><textarea value={(state.framework.criteria?.[stage] || []).join('\n')} onChange={e => setCriteria(stage, e.target.value)} /></div>)}</section>; }
function Groups({ state, update }) { function edit(i, key, value) { const groupTemplates = [...groups(state)]; groupTemplates[i] = { ...groupTemplates[i], [key]: value }; update({ framework: { ...state.framework, groupTemplates, groups: groupTemplates.map(g => `${g.name}: ${g.detail || ''}`) } }); } function addGroup() { const groupTemplates = [...groups(state), { id: 'g' + Date.now(), name: 'New Group', detail: 'Choose stages', stages: [], colour: 'blue' }]; update({ framework: { ...state.framework, groupTemplates, groups: groupTemplates.map(g => `${g.name}: ${g.detail || ''}`) } }); } return <section className='card'><h2>Group templates</h2><button className='btn org' onClick={addGroup}>+ Add group</button>{groups(state).map((g, i) => <div className='card' key={g.id}><Field label='Group name' value={g.name} onChange={v => edit(i, 'name', v)} /><Field label='Detail' value={g.detail || ''} onChange={v => edit(i, 'detail', v)} /><div>{state.framework.stages.map(stage => <label className='pill' key={stage}><input type='checkbox' checked={g.stages?.includes(stage)} onChange={e => { const next = e.target.checked ? [...(g.stages || []), stage] : (g.stages || []).filter(x => x !== stage); edit(i, 'stages', next); }} /> {stage}</label>)}</div></div>)}</section>; }
function Certificates({ state, update }) { function addCert() { update({ certificates: [...state.certificates, { id: 'cert' + Date.now(), name: 'New Certificate Template', rule: 'Highest achieved stage', font: 'Serif', size: 32, groupBy: 'Year group' }] }); } return <section className='card'><h2>Certificate templates</h2><button className='btn org' onClick={addCert}>+ Add certificate template</button>{state.certificates.map(c => <div className='card' key={c.id}><div className='grid'><Field label='Name' value={c.name} onChange={v => update({ certificates: state.certificates.map(x => x.id === c.id ? { ...x, name: v } : x) })} /><Select label='Rule' value={c.rule} onChange={v => update({ certificates: state.certificates.map(x => x.id === c.id ? { ...x, rule: v } : x) })} options={['Highest achieved stage', 'National Curriculum achieved', 'Selected award only'].map(x => ({ value: x, label: x }))} /><Select label='Group by' value={c.groupBy} onChange={v => update({ certificates: state.certificates.map(x => x.id === c.id ? { ...x, groupBy: v } : x) })} options={['Year group', 'Class/group', 'Award', 'All in one PDF'].map(x => ({ value: x, label: x }))} /><Field label='Font' value={c.font} onChange={v => update({ certificates: state.certificates.map(x => x.id === c.id ? { ...x, font: v } : x) })} /><Field label='Font size' value={String(c.size)} onChange={v => update({ certificates: state.certificates.map(x => x.id === c.id ? { ...x, size: Number(v) || 32 } : x) })} /></div></div>)}</section>; }
function Permissions({ state, update }) { const keys = ['sessions', 'groups', 'learners', 'assess', 'export', 'framework', 'certificates']; return <section className='card'><h2>Staff permissions</h2>{state.staff.map((p, i) => <div className='card' key={p.id}><h3>{p.name}</h3><p className='muted'>{p.role}</p>{keys.map(k => <label className='pill' key={k}><input type='checkbox' checked={!!p[k]} onChange={e => { const staff = [...state.staff]; staff[i] = { ...staff[i], [k]: e.target.checked }; update({ staff, audit: [`Updated ${p.name} permission: ${k}`, ...state.audit] }); }} /> {k}</label>)}</div>)}</section>; }
function Distance({ label, value, onChange }) { return <Select label={label} value={value} onChange={onChange} options={distances.map(x => ({ value: x, label: x }))} />; }
function Field({ label, value, onChange }) { return <div className='field'><label>{label}</label><input value={value || ''} onChange={e => onChange(e.target.value)} /></div>; }
function Select({ label, value, onChange, options }) { return <div className='field'><label>{label}</label><select value={value || ''} onChange={e => onChange(e.target.value)}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>; }

createRoot(document.getElementById('root')).render(<App />);
