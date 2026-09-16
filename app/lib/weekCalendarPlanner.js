import { demoFramework, demoLearners, demoLessons } from '../data/demoData.js';
import { loadAppState, saveAppState } from './localStore.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const STORAGE_START = 8 * 60;
const STORAGE_END = 19 * 60;
const SLOT_MINUTES = 30;
const RESIZE_STEP_MINUTES = 15;
const MIN_DURATION = 15;
const MAX_DURATION = 180;

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

let didDragResize = false;
let resizeSession = null;

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
  if (lesson.programme) return normaliseProgramme(lesson.programme);
  const combined = `${lesson.school || ''} ${lesson.name || ''} ${lesson.year || ''} ${lesson.className || ''}`.toLowerCase();
  if (combined.includes('1:1') || combined.includes('121') || combined.includes('one to one') || combined.includes('one-to-one')) return 'Evening Swim 1:1';
  if (combined.includes('evening')) return 'Evening Swim Group';
  if (combined.includes('private')) return 'Private Lessons';
  if (combined.includes('gym')) return 'Gymnastics';
  if (combined.includes('pe')) return 'School PE';
  return 'School Swimming';
}

function normaliseProgramme(programme) {
  const value = String(programme || '').trim();
  if (!value) return 'School Swimming';
  if (value === 'Evening Swim Lessons') return 'Evening Swim Group';
  if (['Evening Swim 121', 'Evening 1:1', 'Evening Swim One-to-one'].includes(value)) return 'Evening Swim 1:1';
  return value;
}

function defaultGroupForProgramme(state, programme) {
  const templates = state.framework?.groupTemplates || [];
  const normalised = normaliseProgramme(programme);
  if (normalised === 'Evening Swim 1:1' || normalised === 'Private Lessons') {
    return templates.find(group => group.id === 'eg121')?.id || templates[0]?.id || '';
  }
  return templates.find(group => group.programme === normalised)?.id || templates[0]?.id || '';
}

function defaultVenue(programme) {
  if (programme === 'Evening Swim 1:1') return 'Evening Swim 1:1';
  if (programme === 'Evening Swim Group') return 'Evening Swim Group';
  if (programme === 'Private Lessons') return 'Private Client';
  if (programme === 'Gymnastics') return 'Gymnastics';
  return 'New School';
}

function defaultYear(programme) {
  if (programme === 'Evening Swim 1:1') return '1:1 swimmer';
  if (programme === 'Evening Swim Group') return 'Evening swimmers';
  if (programme === 'Gymnastics') return 'Class group';
  if (programme === 'School PE') return 'Year group';
  return 'Year group';
}

function defaultClassName(programme) {
  if (programme === 'Evening Swim 1:1') return 'All stages';
  if (programme === 'Evening Swim Group') return 'Stage 1-3';
  if (programme === 'Gymnastics') return 'Beginners';
  if (programme === 'School PE') return 'PE group';
  return '';
}

function defaultLessonName(programme) {
  if (programme === 'School Swimming') return 'New School Swim Class';
  if (programme === 'Evening Swim Group') return 'Evening Swim Group';
  if (programme === 'Evening Swim 1:1') return 'Evening Swim 1:1';
  if (programme === 'Gymnastics') return 'Gymnastics Class';
  if (programme === 'School PE') return 'School PE Class';
  return `New ${programme} Session`;
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

function lessonsForDay(lessons, day) {
  return lessons.filter(lesson => (lesson.day || 'Tuesday') === day);
}

function daySummaryLabel(lessons, day) {
  const dayLessons = lessonsForDay(lessons, day);
  if (!dayLessons.length) return 'No sessions';
  const names = dayLessons.reduce((total, lesson) => total + namesInLesson(getState(), lesson.id), 0);
  return `${dayLessons.length} session${dayLessons.length === 1 ? '' : 's'} · ${names} name${names === 1 ? '' : 's'}`;
}

function todayName() {
  const index = new Date().getDay();
  return index >= 1 && index <= 5 ? DAYS[index - 1] : '';
}

function getSelectedProgrammeFromFilter(state) {
  const filter = normaliseProgramme(state.timetableFilter || 'All');
  return filter && filter !== 'All' ? filter : 'School Swimming';
}

function findField(labels) {
  const wanted = Array.isArray(labels) ? labels : [labels];
  return Array.from(document.querySelectorAll('.field')).find(field => {
    const label = field.querySelector('label')?.textContent?.trim();
    return wanted.includes(label);
  });
}

function ensureOption(select, value, label = value) {
  if (!select || Array.from(select.options).some(option => option.value === value)) return;
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  select.appendChild(option);
}

function nativeSetValue(input, value) {
  if (!input || input.value === value) return false;
  const proto = input instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : input instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function setInputField(labels, value) {
  const input = findField(labels)?.querySelector('input, textarea');
  return nativeSetValue(input, value);
}

function setSelectField(labels, value, label = value) {
  const select = findField(labels)?.querySelector('select');
  if (!select) return false;
  ensureOption(select, value, label);
  return nativeSetValue(select, value);
}

function clickCurrentDayButton(day) {
  const tab = Array.from(document.querySelectorAll('.tabs button')).find(button => button.textContent.trim() === day);
  if (!tab) return false;
  tab.click();
  return true;
}

function findAddSessionButton() {
  return Array.from(document.querySelectorAll('button')).find(button => {
    const label = (button.textContent || '').trim();
    return label === '+ Add class/session' || label === '+ Add group lesson' || label.includes('Add class/session');
  });
}

function findVisibleLessonCard(lesson) {
  return Array.from(document.querySelectorAll('section.lesson')).find(card => {
    const title = card.querySelector('h2')?.textContent?.trim();
    const time = card.querySelector('.time')?.textContent?.trim();
    return title === lesson.name && (!time || time === lesson.time);
  });
}

function clickVisibleLessonOpenButton(lesson) {
  const card = findVisibleLessonCard(lesson);
  const button = Array.from(card?.querySelectorAll('button') || []).find(button => {
    const label = (button.textContent || '').trim().toLowerCase();
    return label === 'open' || label === 'open lesson';
  });
  if (!button) return false;
  button.click();
  return true;
}

function reloadIntoLessonRegister(state, lesson, firstPresent) {
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

function setCurrentDay(day) {
  if (clickCurrentDayButton(day)) return;
  const state = getState();
  persistState({ ...state, screen: 'timetable', step: 'list', currentDay: day });
  window.location.reload();
}

function openLesson(lessonId) {
  if (didDragResize) return;
  const state = getState();
  const lesson = (state.lessons || []).find(item => item.id === lessonId);
  if (!lesson) return;
  const firstPresent = (state.learners || []).find(item => item.lesson === lesson.id && item.att !== 'Absent') || (state.learners || []).find(item => item.lesson === lesson.id);

  const attemptOpen = () => {
    if (clickVisibleLessonOpenButton(lesson)) return true;
    reloadIntoLessonRegister(getState(), lesson, firstPresent);
    return false;
  };

  if ((state.currentDay || 'Tuesday') !== (lesson.day || 'Tuesday')) {
    if (clickCurrentDayButton(lesson.day || 'Tuesday')) {
      window.setTimeout(attemptOpen, 140);
      return;
    }
  }

  attemptOpen();
}

function applyCreatedLessonForm(day, time, programme) {
  const state = getState();
  const groupId = defaultGroupForProgramme(state, programme);
  setSelectField('Day', day);
  setInputField('Start time', time);
  setSelectField(['Programme', 'Activity / programme'], programme);
  window.setTimeout(() => {
    setSelectField(['Assessment group', 'Criteria group'], groupId, groupId === 'eg121' ? 'Evening Swim 1:1 — All stages visible' : groupId);
    setInputField('Lesson name', defaultLessonName(programme));
    setInputField('School / venue', defaultVenue(programme));
    setInputField('Year / class', defaultYear(programme));
    setInputField('Coach', 'Lewis');
    setSelectField('Duration', String(SLOT_MINUTES), `${SLOT_MINUTES} minutes`);
  }, 80);
}

function createLessonWithForm(day, time) {
  const state = getState();
  const programme = getSelectedProgrammeFromFilter(state);
  const addButton = findAddSessionButton();
  if (!addButton) return false;
  addButton.click();
  window.setTimeout(() => applyCreatedLessonForm(day, time, programme), 120);
  return true;
}

function createLessonWithReload(day, time) {
  const state = getState();
  const programme = getSelectedProgrammeFromFilter(state);
  const id = `l${Date.now()}`;
  const lesson = {
    id,
    day,
    time,
    duration: SLOT_MINUTES,
    school: defaultVenue(programme),
    year: defaultYear(programme),
    className: defaultClassName(programme),
    coach: 'Lewis',
    name: defaultLessonName(programme),
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

function createLesson(day, time) {
  if ((getState().currentDay || 'Tuesday') !== day) {
    if (clickCurrentDayButton(day)) {
      window.setTimeout(() => {
        if (!createLessonWithForm(day, time)) createLessonWithReload(day, time);
      }, 140);
      return;
    }
  }
  if (!createLessonWithForm(day, time)) createLessonWithReload(day, time);
}

function updateLessonPatch(lessonId, patch) {
  const state = getState();
  const lessons = (state.lessons || []).map(lesson => lesson.id === lessonId ? { ...lesson, ...patch } : lesson);
  persistState({ ...state, lessons });
}

function clampDuration(duration) {
  const rounded = Math.round((Number(duration) || SLOT_MINUTES) / RESIZE_STEP_MINUTES) * RESIZE_STEP_MINUTES;
  return Math.max(MIN_DURATION, Math.min(MAX_DURATION, rounded));
}

function cellStepHeight(grid) {
  const raw = window.getComputedStyle(grid).getPropertyValue('--week-slot-height').trim();
  const slotHeight = Number(String(raw).replace('px', '')) || 42;
  return slotHeight / (SLOT_MINUTES / RESIZE_STEP_MINUTES);
}

function beginResize(event, lessonId) {
  const state = getState();
  const lesson = (state.lessons || []).find(item => item.id === lessonId);
  const card = event.target.closest('.week-event');
  const grid = card?.closest('.week-calendar-grid');
  if (!lesson || !card || !grid) return;

  event.preventDefault();
  event.stopPropagation();
  didDragResize = false;
  resizeSession = {
    lessonId,
    card,
    grid,
    startY: event.clientY,
    startDuration: clampDuration(lesson.duration || SLOT_MINUTES),
    nextDuration: clampDuration(lesson.duration || SLOT_MINUTES),
    stepHeight: cellStepHeight(grid)
  };
  card.classList.add('resizing');
  card.setPointerCapture?.(event.pointerId);
  window.addEventListener('pointermove', resizeMove);
  window.addEventListener('pointerup', endResize, { once: true });
}

function resizeMove(event) {
  if (!resizeSession) return;
  const steps = Math.round((event.clientY - resizeSession.startY) / resizeSession.stepHeight);
  const duration = clampDuration(resizeSession.startDuration + steps * RESIZE_STEP_MINUTES);
  resizeSession.nextDuration = duration;
  if (Math.abs(event.clientY - resizeSession.startY) > 4) didDragResize = true;

  const rowSpan = Math.max(1, Math.ceil(duration / SLOT_MINUTES));
  const style = resizeSession.card.style.gridRow || '';
  const startRow = style.split('/')[0]?.trim() || 'auto';
  resizeSession.card.style.gridRow = `${startRow} / span ${rowSpan}`;
  const label = resizeSession.card.querySelector('.week-resize-label');
  if (label) label.textContent = `${duration}m`;
}

function endResize() {
  if (!resizeSession) return;
  const { lessonId, nextDuration, startDuration, card } = resizeSession;
  card.classList.remove('resizing');
  window.removeEventListener('pointermove', resizeMove);
  if (nextDuration !== startDuration) {
    updateLessonPatch(lessonId, { duration: nextDuration });
    showCalendarToast(`Saved as ${nextDuration} minutes`);
    renderCalendar();
  }
  resizeSession = null;
  window.setTimeout(() => { didDragResize = false; }, 120);
}

function showCalendarToast(message) {
  const old = document.querySelector('[data-week-toast]');
  if (old) old.remove();
  const toast = document.createElement('div');
  toast.className = 'week-calendar-toast';
  toast.dataset.weekToast = 'true';
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 1800);
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
  const duration = clampDuration(lesson.duration || SLOT_MINUTES);
  const startRow = 2 + Math.max(0, Math.round((start - rangeStart) / SLOT_MINUTES));
  const rowSpan = Math.max(1, Math.ceil(duration / SLOT_MINUTES));
  const column = 2 + dayIndex;
  const programme = programmeName(lesson);
  const count = namesInLesson(state, lesson.id);
  return `
    <div role="button" tabindex="0" class="week-event ${colourClass(programme)}" style="grid-row:${startRow} / span ${rowSpan};grid-column:${column}" data-week-action="open" data-lesson-id="${lesson.id}" title="Open ${text(lesson.name)}">
      <span class="week-event-time">${text(lesson.time)}–${text(addMinutes(lesson.time, duration))}</span>
      <strong>${text(lesson.name)}</strong>
      <small>${text(programme)} · ${count} ${count === 1 ? 'name' : 'names'}</small>
      <em>${text(getGroupLabel(state, lesson))}</em>
      <span class="week-resize-label">${duration}m</span>
      <span class="week-resize-handle" data-week-resize="true" aria-hidden="true"></span>
    </div>
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
    ? `${normaliseProgramme(state.timetableFilter)} only`
    : 'All programmes';
  const today = todayName();

  const gridHeaders = [
    '<div class="week-corner" style="grid-row:1;grid-column:1">Time</div>',
    ...DAYS.map((day, index) => `
      <button class="week-day ${state.currentDay === day ? 'on' : ''} ${today === day ? 'today' : ''}" style="grid-row:1;grid-column:${index + 2}" data-week-action="day" data-day="${day}">
        ${day.slice(0, 3)}<span>${daySummaryLabel(lessons, day)}</span>
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
        <span>${text(selectedFilter)} · tap a lesson to open register · drag bottom edge to resize</span>
      </div>
      <div class="week-calendar-key">
        <span>Tap empty slot = new class/session</span>
        <span>Bottom grip = change duration</span>
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

  section.addEventListener('pointerdown', event => {
    const handle = event.target.closest('[data-week-resize]');
    if (!handle) return;
    const eventCard = handle.closest('[data-lesson-id]');
    beginResize(event, eventCard?.dataset.lessonId);
  });

  section.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target.closest('[data-week-action]');
    if (!target) return;
    event.preventDefault();
    target.click();
  });

  section.addEventListener('click', event => {
    if (didDragResize || event.target.closest('[data-week-resize]')) return;
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
