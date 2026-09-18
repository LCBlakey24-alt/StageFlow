import { demoFramework, demoLearners, demoLessons } from '../data/demoData.js';
import { loadAppState, saveAppState } from './localStore.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const APP_START = 7 * 60;
const APP_END = 21 * 60;
const STEP_MINUTES = 15;
const DEFAULT_DURATION = 30;

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

let suppressClickUntil = 0;

function state() {
  return loadAppState(fallbackState);
}

function persist(nextState) {
  saveAppState(nextState);
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

function timeToMinutes(time) {
  const [hours, minutes] = String(time || '00:00').split(':').map(Number);
  return ((Number.isFinite(hours) ? hours : 0) * 60) + (Number.isFinite(minutes) ? minutes : 0);
}

function formatTime(total) {
  const safe = Math.max(0, Number(total) || 0);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function roundUpToStep(minutes) {
  return Math.ceil((Number(minutes) || 0) / STEP_MINUTES) * STEP_MINUTES;
}

function dayIndex(day) {
  const index = DAYS.indexOf(day || 'Tuesday');
  return index >= 0 ? index : 1;
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function hasClash(lessons, candidate, excludeLessonId = '') {
  const start = candidate.minutes;
  const end = start + candidate.duration;
  return lessons.some(lesson => {
    if (lesson.id === excludeLessonId) return false;
    if ((lesson.day || 'Tuesday') !== candidate.day) return false;
    const lessonStart = timeToMinutes(lesson.time || '09:00');
    const lessonEnd = lessonStart + (Number(lesson.duration) || DEFAULT_DURATION);
    return rangesOverlap(start, end, lessonStart, lessonEnd);
  });
}

function nextCandidateAfter(lesson) {
  const duration = Number(lesson.duration) || DEFAULT_DURATION;
  return {
    day: lesson.day || 'Tuesday',
    minutes: roundUpToStep(timeToMinutes(lesson.time || '09:00') + duration),
    duration
  };
}

function findNextFreeSlot(lessons, lesson) {
  const original = nextCandidateAfter(lesson);
  const duration = original.duration;
  const originalDayIndex = dayIndex(original.day);
  const orderedDays = [
    original.day,
    ...DAYS.slice(originalDayIndex + 1),
    ...DAYS.slice(0, originalDayIndex)
  ];

  for (const day of orderedDays) {
    const sameDay = day === original.day;
    const firstStart = sameDay ? Math.max(APP_START, original.minutes) : Math.max(APP_START, timeToMinutes(lesson.time || '09:00'));
    for (let minutes = roundUpToStep(firstStart); minutes <= APP_END - duration; minutes += STEP_MINUTES) {
      const candidate = { day, minutes, duration };
      if (!hasClash(lessons, candidate, lesson.id)) return candidate;
    }
  }

  return {
    day: DAYS[(originalDayIndex + 1) % DAYS.length],
    minutes: Math.max(APP_START, Math.min(APP_END - duration, timeToMinutes(lesson.time || '09:00'))),
    duration
  };
}

function cloneLearnerForLesson(learner, lessonId, index) {
  return {
    ...learner,
    id: `p${Date.now()}-${index}`,
    lesson: lessonId,
    att: learner.att || 'Present',
    res: { ...(learner.res || {}) },
    dist: { ...(learner.dist || { front: '0m', back: '0m' }) },
    nc: { ...(learner.nc || {}) },
    breathing: { ...(learner.breathing || {}) }
  };
}

function duplicateLesson(lessonId) {
  const current = state();
  const sourceLesson = (current.lessons || []).find(lesson => lesson.id === lessonId);
  if (!sourceLesson) return;

  const copyProgress = window.confirm('Copy names and assessment progress as well?\n\nOK = copy the session, names and progress.\nCancel = copy the session setup only.');
  const slot = findNextFreeSlot(current.lessons || [], sourceLesson);
  const newLessonId = `l${Date.now()}`;
  const newLesson = {
    ...sourceLesson,
    id: newLessonId,
    day: slot.day,
    time: formatTime(slot.minutes),
    duration: slot.duration,
    name: sourceLesson.name || 'Copied class/session'
  };

  const copiedLearners = copyProgress
    ? (current.learners || [])
        .filter(learner => learner.lesson === sourceLesson.id)
        .map((learner, index) => cloneLearnerForLesson(learner, newLessonId, index))
    : [];

  const nextState = {
    ...current,
    lessons: [...(current.lessons || []), newLesson],
    learners: [...(current.learners || []), ...copiedLearners],
    screen: 'timetable',
    step: 'list',
    active: newLessonId,
    selected: copiedLearners[0]?.id || '',
    currentDay: slot.day,
    audit: [`Copied ${sourceLesson.name || 'class/session'} to ${slot.day} ${formatTime(slot.minutes)}`, ...(current.audit || [])]
  };

  persist(nextState);
  suppressClickUntil = Date.now() + 500;
  showToast(`Copied to ${slot.day} ${formatTime(slot.minutes)}${copyProgress ? ' with names' : ''}`);
  window.setTimeout(() => window.location.reload(), 650);
}

function showToast(message) {
  const existing = document.querySelector('[data-week-copy-toast]');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'week-calendar-toast week-copy-toast';
  toast.dataset.weekCopyToast = 'true';
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 1800);
}

function addCopyHandle(card) {
  if (card.querySelector('[data-week-copy]')) return;
  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'week-copy-handle';
  handle.dataset.weekCopy = 'true';
  handle.title = 'Copy this class/session';
  handle.textContent = 'Copy';
  card.appendChild(handle);
}

function addStyles() {
  if (document.getElementById('stageflow-week-copy-style')) return;
  const style = document.createElement('style');
  style.id = 'stageflow-week-copy-style';
  style.textContent = `
    .week-copy-handle {
      position: absolute;
      right: 48px;
      top: 5px;
      z-index: 4;
      border: 1px solid rgba(255,255,255,.26);
      background: rgba(255,255,255,.18);
      color: #fff;
      border-radius: 999px;
      padding: 2px 6px;
      font-size: 9px;
      line-height: 1;
      font-weight: 1000;
      cursor: pointer;
      touch-action: manipulation;
      box-shadow: 0 4px 10px rgba(15,23,42,.14);
    }
    .week-event:hover .week-copy-handle,
    .week-copy-handle:focus-visible {
      background: #fff;
      color: #071527;
      outline: none;
    }
    .week-copy-toast {
      background: #0f172a !important;
      color: #fff !important;
      border: 1px solid rgba(255,255,255,.14) !important;
    }
    @media(max-width:850px) {
      .week-copy-handle {
        right: 50px;
        top: 4px;
        padding: 3px 7px;
        font-size: 9px;
      }
      .week-event strong {
        padding-right: 88px;
      }
    }
  `;
  document.head.appendChild(style);
}

function enhanceCalendar() {
  addStyles();
  document.querySelectorAll('.week-event[data-lesson-id]').forEach(addCopyHandle);

  const headText = document.querySelector('[data-stageflow-week-calendar] .week-calendar-head span');
  if (headText && !headText.textContent.includes('Copy = duplicate')) {
    headText.textContent = `${headText.textContent} · Copy = duplicate`;
  }

  const key = document.querySelector('[data-stageflow-week-calendar] .week-calendar-key');
  if (key && !key.querySelector('[data-week-copy-key]')) {
    const item = document.createElement('span');
    item.dataset.weekCopyKey = 'true';
    item.textContent = 'Copy = duplicate session';
    key.appendChild(item);
  }
}

function installListeners() {
  if (window.__stageFlowWeekCopyInstalled) return;
  window.__stageFlowWeekCopyInstalled = true;

  document.addEventListener('click', event => {
    const handle = event.target.closest('[data-week-copy]');
    if (!handle) {
      if (Date.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
      return;
    }
    const card = handle.closest('.week-event[data-lesson-id]');
    if (!card) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    duplicateLesson(card.dataset.lessonId);
  }, true);
}

installListeners();
window.addEventListener('load', enhanceCalendar);
new MutationObserver(enhanceCalendar).observe(document.documentElement, { childList: true, subtree: true });
setTimeout(enhanceCalendar, 250);
setTimeout(enhanceCalendar, 900);
