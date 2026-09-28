import { demoFramework, demoLearners, demoLessons } from '../data/demoData.js';
import { loadAppState } from './localStore.js';

const STATE_KEY = 'stageflow-state';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
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

function normaliseProgramme(programme) {
  const value = String(programme || '').trim();
  if (value === 'Evening Swim Lessons' || value === 'Group Lessons') return 'Evening Swim Group';
  if (['1:1 Lessons', 'One-to-one Lessons', 'Evening Swim 121', 'Evening 1:1', 'Evening Swim One-to-one'].includes(value)) return 'Evening Swim 1:1';
  return value || 'School Swimming';
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

function timeToMinutes(time) {
  const [hours, minutes] = String(time || '00:00').split(':').map(Number);
  return ((Number.isFinite(hours) ? hours : 0) * 60) + (Number.isFinite(minutes) ? minutes : 0);
}

function lessonEnd(lesson) {
  return timeToMinutes(lesson.time || '09:00') + (Number(lesson.duration) || 30);
}

function overlaps(a, b) {
  const aStart = timeToMinutes(a.time || '09:00');
  const bStart = timeToMinutes(b.time || '09:00');
  return aStart < lessonEnd(b) && bStart < lessonEnd(a);
}

function getVisibleLessons(state) {
  const filter = normaliseProgramme(state.timetableFilter || 'All');
  return (state.lessons || [])
    .filter(lesson => DAYS.includes(lesson.day || 'Tuesday'))
    .filter(lesson => filter === 'All' || programmeName(lesson) === filter);
}

function detectConflicts(state) {
  const lessons = getVisibleLessons(state);
  const conflictsByLesson = new Map();
  const conflictsByDay = new Map();

  DAYS.forEach(day => {
    const dayLessons = lessons.filter(lesson => (lesson.day || 'Tuesday') === day);
    for (let i = 0; i < dayLessons.length; i += 1) {
      for (let j = i + 1; j < dayLessons.length; j += 1) {
        const left = dayLessons[i];
        const right = dayLessons[j];
        if (!overlaps(left, right)) continue;
        if (!conflictsByLesson.has(left.id)) conflictsByLesson.set(left.id, []);
        if (!conflictsByLesson.has(right.id)) conflictsByLesson.set(right.id, []);
        conflictsByLesson.get(left.id).push(right.name || right.time || 'another session');
        conflictsByLesson.get(right.id).push(left.name || left.time || 'another session');
        conflictsByDay.set(day, (conflictsByDay.get(day) || 0) + 1);
      }
    }
  });

  return { conflictsByLesson, conflictsByDay };
}

function addStyles() {
  if (document.getElementById('stageflow-week-conflict-style')) return;
  const style = document.createElement('style');
  style.id = 'stageflow-week-conflict-style';
  style.textContent = `
    .week-event.conflict {
      box-shadow: 0 0 0 3px rgba(239,68,68,.78), 0 16px 30px rgba(127,29,29,.28) !important;
    }
    .week-event.conflict:before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(135deg, rgba(239,68,68,.22), rgba(255,255,255,0));
      pointer-events: none;
    }
    .week-conflict-badge {
      position: absolute;
      left: 8px;
      bottom: 4px;
      z-index: 4;
      border-radius: 999px;
      background: #fff;
      color: #991b1b;
      border: 1px solid rgba(127,29,29,.26);
      padding: 1px 6px;
      font-size: 9px;
      line-height: 1.25;
      font-weight: 1000;
      box-shadow: 0 4px 10px rgba(15,23,42,.16);
      pointer-events: none;
    }
    .week-day.has-conflict:not(.on) {
      background: #fff1f2;
      color: #991b1b;
      box-shadow: inset 0 -4px 0 #ef4444;
    }
    .week-day .week-day-conflict {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-top: 2px;
      border-radius: 999px;
      background: #ef4444;
      color: #fff;
      padding: 1px 6px;
      font-size: 9px;
      font-weight: 1000;
      line-height: 1.3;
    }
    .week-calendar-conflict-note {
      display: inline-flex !important;
      align-items: center;
      gap: 5px;
      border-color: rgba(239,68,68,.24) !important;
      background: #fff1f2 !important;
      color: #991b1b !important;
    }
    @media(max-width:850px) {
      .week-conflict-badge {
        left: 6px;
        bottom: 3px;
        font-size: 8px;
      }
      .week-event.conflict .week-resize-label {
        display: none;
      }
    }
  `;
  document.head.appendChild(style);
}

function clearConflictMarks(calendar) {
  calendar.querySelectorAll('.week-event.conflict').forEach(card => {
    card.classList.remove('conflict');
    card.removeAttribute('aria-label');
    card.querySelectorAll('.week-conflict-badge').forEach(badge => badge.remove());
  });
  calendar.querySelectorAll('.week-day.has-conflict').forEach(day => {
    day.classList.remove('has-conflict');
    day.querySelectorAll('.week-day-conflict').forEach(item => item.remove());
  });
  calendar.querySelectorAll('[data-week-conflict-note]').forEach(note => note.remove());
}

function markLesson(card, names) {
  card.classList.add('conflict');
  const label = `Clashes with ${names.slice(0, 2).join(', ')}${names.length > 2 ? ' and more' : ''}`;
  card.setAttribute('aria-label', label);
  if (!card.querySelector('.week-conflict-badge')) {
    const badge = document.createElement('span');
    badge.className = 'week-conflict-badge';
    badge.textContent = 'Overlap';
    badge.title = label;
    card.appendChild(badge);
  }
}

function markDay(calendar, day, count) {
  const button = Array.from(calendar.querySelectorAll('.week-day')).find(item => item.dataset.day === day || item.textContent.trim().startsWith(day.slice(0, 3)));
  if (!button) return;
  button.classList.add('has-conflict');
  if (!button.querySelector('.week-day-conflict')) {
    const badge = document.createElement('strong');
    badge.className = 'week-day-conflict';
    badge.textContent = `${count} overlap${count === 1 ? '' : 's'}`;
    button.appendChild(badge);
  }
}

function addKeyNote(calendar, total) {
  const key = calendar.querySelector('.week-calendar-key');
  if (!key || key.querySelector('[data-week-conflict-note]')) return;
  const item = document.createElement('span');
  item.className = 'week-calendar-conflict-note';
  item.dataset.weekConflictNote = 'true';
  item.textContent = `${total} timetable overlap${total === 1 ? '' : 's'} flagged`;
  key.prepend(item);
}

function enhanceCalendar() {
  addStyles();
  const calendar = document.querySelector('[data-stageflow-week-calendar]');
  if (!calendar) return;
  clearConflictMarks(calendar);

  const state = getState();
  const { conflictsByLesson, conflictsByDay } = detectConflicts(state);
  const total = Array.from(conflictsByDay.values()).reduce((sum, value) => sum + value, 0);
  if (!total) return;

  conflictsByLesson.forEach((names, lessonId) => {
    const card = calendar.querySelector(`.week-event[data-lesson-id="${CSS.escape(lessonId)}"]`);
    if (card) markLesson(card, names);
  });
  conflictsByDay.forEach((count, day) => markDay(calendar, day, count));
  addKeyNote(calendar, total);
}

function install() {
  if (window.__stageFlowWeekConflictWarningsInstalled) return;
  window.__stageFlowWeekConflictWarningsInstalled = true;
  window.addEventListener('storage', event => {
    if (event.key === STATE_KEY) window.setTimeout(enhanceCalendar, 80);
  });
}

install();
window.addEventListener('load', enhanceCalendar);
new MutationObserver(enhanceCalendar).observe(document.documentElement, { childList: true, subtree: true });
setTimeout(enhanceCalendar, 250);
setTimeout(enhanceCalendar, 900);
setTimeout(enhanceCalendar, 1600);
