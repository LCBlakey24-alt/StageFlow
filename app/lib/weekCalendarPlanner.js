import { demoFramework, demoLearners, demoLessons } from '../data/demoData.js';
import { loadAppState, saveAppState } from './localStore.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const STORAGE_START = 8 * 60;
const STORAGE_END = 19 * 60;
const SLOT_MINUTES = 30;

const fallbackState = {
  screen: 'timetable',
  step: 'list',
  currentDay: 'Tuesday',
  timetableFilter: 'All',
  active: demoLessons[0]?.id || '',
  selected: '',
  assessmentMode: 'swimmer',
  lessons: demoLessons,
  learners: demoLearners,
  framework: demoFramework,
  certificates: [],
  staff: [],
  pack: {},
  audit: []
};

function getState() {
  return loadAppState(fallbackState);
}

function persistState(state) {
  saveAppState(state);
}

function text(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function timeToMinutes(time) {
  const [hours, minutes] = String(time || '00:00').split(':').map(Number);
  return ((Number.isFinite(hours) ? hours : 0) * 60) + (Number.isFinite(minutes) ? minutes : 0);
}

function formatTime(total) {
  const safe = Math.max(0, Number(total) || 0);
  const hours = String(Math.floor(safe / 60)).padStart(2, '0');
  const minutes = String(safe % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function addMinutes(time, minutes) {
  return formatTime(timeToMinutes(time) + (Number(minutes) || 0));
}

function programmeName(lesson = {}) {
  if (lesson.programme) return lesson.programme === 'Evening Swim Lessons' ? 'Evening Swim Group' : lesson.programme;
  const combined = `${lesson.school || ''} ${lesson.name || ''} ${lesson.year || ''} ${lesson.className || ''}`.toLowerCase();
  if (combined.includes('1:1') || combined.includes('121') || combined.includes('one to one') || combined.includes('one-to-one')) return 'Evening Swim 1:1';
  if (combined.includes('evening')) return 'Evening Swim Group';
  if (combined.includes('private')) return 'Private Lessons';
  if (combined.includes('gym')) return 'Gymnastics';
  if (combined.includes('pe')) return 'School PE';
  return 'School Swimming';
}

function defaultGroupForProgramme(state, programme) {
  const templates = state.framework?.groupTemplates || [];
  if (programme === 'Evening Swim 1:1' || programme === 'Private Lessons') {
    return templates.find(group => group.id === 'eg121')?.id || templates[0]?.id || '';
  }
  return templates.find(group => group.programme === programme)?.id || templates[0]?.id || '';
}

function defaultVenue(programme) {
  if (programme === 'Evening Swim 1:1') return 'Evening Swim 1:1';
  if (programme === 'Evening Swim Group') return 'Evening Swim Group';
  if (programme === 'Private Lessons') return 'Private Client';
  if (programme === 'Gymnastics') return 'Gymnastics';
  return 'New School';
}

function defaultClassName(programme) {
  if (programme === 'Evening Swim 1:1') return 'All stages';
  if (programme === 'Gymnastics') return 'Beginners';
  if (programme === 'School PE') return 'PE group';
  return '';
}

function colourClass(programme) {
  if (programme === 'Evening Swim 1:1') return 'gold';
  if (programme === 'Evening Swim Group') return 'orange';
  if (programme === 'Gymnastics') return 'purple';
  if (programme === 'School PE') return 'blue';
  if (programme === 'Private Lessons') return 'dark';
  return 'swim';
}

function lessonsForCalendar(state) {
  const filter = state.timetableFilter || 'All';
  return [...(state.lessons || [])]
    .filter(lesson => DAYS.includes(lesson.day || 'Tuesday'))
    .filter(lesson => filter === 'All' || programmeName(lesson) === filter)
    .sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || timeToMinutes(a.time) - timeToMinutes(b.time));
}

function calendarRange(lessons) {
  if (!lessons.length) return { start: STORAGE_START, end: STORAGE_END };
  const first = Math.min(...lessons.map(lesson => timeToMinutes(lesson.time || '09:00')));
  const last = Math.max(...lessons.map(lesson => timeToMinutes(lesson.time || '09:00') + (Number(lesson.duration) || SLOT_MINUTES)));
  const start = Math.max(7 * 60, Math.min(STORAGE_START, Math.floor(first / 60) * 60));
  const end = Math.min(21 * 60, Math.max(STORAGE_END, Math.ceil(last / 60) * 60));
  return { start, end };
}

function getGroupLabel(state, lesson) {
  const group = (state.framework?.groupTemplates || []).find(item => item.id === lesson.groupTemplateId);
  if (!group) return 'No criteria group';
  return `${group.name}${group.detail ? ` · ${group.detail}` : ''}`;
}

function namesInLesson(state, lessonId) {
  return (state.learners || []).filter(learner => learner.lesson === lessonId).length;
}

function setCurrentDay(day) {
  const state = getState();
  persistState({ ...state, screen: 'timetable', step: 'list', currentDay: day });
  window.location.reload();
}

function openLesson(lessonId) {
  const state = getState();
  const lesson = (state.lessons || []).find(item => item.id === lessonId);
  if (!lesson) return;
  const firstPresent = (state.learners || []).find(item => item.lesson === lesson.id && item.att !== 'Absent') || (state.learners || []).find(item => item.lesson === lesson.id);
  persistState({
    ...state,
    screen: 'timetable',
    step: 'register',
    active: lesson.id,
    selected: firstPresent?.id || '',
    currentDay: lesson.day || state.currentDay || 'Tuesday'
  });
  window.location.reload();
}

function createLesson(day, time) {
  const state = getState();
  const programme = state.timetableFilter && state.timetableFilter !== 'All' ? state.timetableFilter : 'School Swimming';
  const id = `l${Date.now()}`;
  const lesson = {
    id,
    day,
    time,
    duration: SLOT_MINUTES,
    school: defaultVenue(programme),
    year: programme === 'Evening Swim 1:1' ? '1:1 swimmer' : 'Year group',
    className: defaultClassName(programme),
    coach: 'Lewis',
    name: programme === 'School Swimming' ? 'New School Swim Class' : `New ${programme} Session`,
    programme,
    groupTemplateId: defaultGroupForProgramme(state, programme),
    mode: 'Stages + National Curriculum'
  };
  persistState({
    ...state,
    lessons: [...(state.lessons || []), lesson],
    screen: 'timetable',
    step: 'edit',
    active: id,
    currentDay: day,
    selected: ''
  });
  window.location.reload();
}

function makeCell(day, slotTime, row, column) {
  return `
    <button class="week-cell" style="grid-row:${row};grid-column:${column}" data-week-action="create" data-day="${day}" data-time="${formatTime(slotTime)}" aria-label="Add session ${day} ${formatTime(slotTime)}">
      <span>${formatTime(slotTime)}</span>
    </button>
  `;
}

function makeEvent(state, lesson, rangeStart) {
  const dayIndex = DAYS.indexOf(lesson.day || 'Tuesday');
  const start = timeToMinutes(lesson.time || '09:00');
  const duration = Math.max(SLOT_MINUTES, Number(lesson.duration) || SLOT_MINUTES);
  const startRow = 2 + Math.max(0, Math.round((start - rangeStart) / SLOT_MINUTES));
  const rowSpan = Math.max(1, Math.ceil(duration / SLOT_MINUTES));
  const column = 2 + dayIndex;
  const programme = programmeName(lesson);
  const count = namesInLesson(state, lesson.id);
  return `
    <button class="week-event ${colourClass(programme)}" style="grid-row:${startRow} / span ${rowSpan};grid-column:${column}" data-week-action="open" data-lesson-id="${lesson.id}" title="Open ${text(lesson.name)}">
      <span class="week-event-time">${text(lesson.time)}–${text(addMinutes(lesson.time, duration))}</span>
      <strong>${text(lesson.name)}</strong>
      <small>${text(programme)} · ${count} ${count === 1 ? 'name' : 'names'}</small>
      <em>${text(getGroupLabel(state, lesson))}</em>
    </button>
  `;
}

function renderCalendar() {
  const toolbar = document.querySelector('.calendar-toolbar');
  const main = document.querySelector('main');
  if (!toolbar || !main) return;

  const previous = main.querySelector('[data-stageflow-week-calendar]');
  if (previous) previous.remove();

  const state = getState();
  const lessons = lessonsForCalendar(state);
  const range = calendarRange(lessons);
  const slotTimes = [];
  for (let time = range.start; time < range.end; time += SLOT_MINUTES) slotTimes.push(time);

  const selectedFilter = state.timetableFilter && state.timetableFilter !== 'All'
    ? `${state.timetableFilter} only`
    : 'All programmes';

  const gridHeaders = [
    '<div class="week-corner" style="grid-row:1;grid-column:1">Time</div>',
    ...DAYS.map((day, index) => `
      <button class="week-day ${state.currentDay === day ? 'on' : ''}" style="grid-row:1;grid-column:${index + 2}" data-week-action="day" data-day="${day}">
        ${day.slice(0, 3)}<span>${day}</span>
      </button>
    `)
  ].join('');

  const timeLabels = slotTimes.map((time, index) => `
    <div class="week-time" style="grid-row:${index + 2};grid-column:1">${formatTime(time)}</div>
  `).join('');

  const cells = slotTimes.flatMap((time, rowIndex) => DAYS.map((day, dayIndex) => makeCell(day, time, rowIndex + 2, dayIndex + 2))).join('');
  const events = lessons.map(lesson => makeEvent(state, lesson, range.start)).join('');

  const section = document.createElement('section');
  section.className = 'card week-calendar-card';
  section.dataset.stageflowWeekCalendar = 'true';
  section.innerHTML = `
    <div class="week-calendar-head">
      <div>
        <p>Calendar view</p>
        <h2>Weekly timetable blocks</h2>
        <span>${text(selectedFilter)} · tap a lesson block to open its register</span>
      </div>
      <div class="week-calendar-key">
        <span>Tap empty space = new class/session</span>
        <span>Drag-to-resize comes next</span>
      </div>
    </div>
    <div class="week-calendar-scroll">
      <div class="week-calendar-grid" style="--week-rows:${slotTimes.length};">
        ${gridHeaders}
        ${timeLabels}
        ${cells}
        ${events}
      </div>
    </div>
  `;

  section.addEventListener('click', event => {
    const target = event.target.closest('[data-week-action]');
    if (!target) return;
    const action = target.dataset.weekAction;
    if (action === 'open') openLesson(target.dataset.lessonId);
    if (action === 'create') createLesson(target.dataset.day, target.dataset.time);
    if (action === 'day') setCurrentDay(target.dataset.day);
  });

  toolbar.insertAdjacentElement('afterend', section);
}

let queued = false;
function queueRender() {
  if (queued) return;
  queued = true;
  window.setTimeout(() => {
    queued = false;
    renderCalendar();
  }, 80);
}

window.addEventListener('load', queueRender);
new MutationObserver(queueRender).observe(document.documentElement, { childList: true, subtree: true });
setTimeout(queueRender, 250);
setTimeout(queueRender, 900);
