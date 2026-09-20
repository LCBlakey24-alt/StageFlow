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
let pendingCopyLessonId = '';

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
    const firstStart = sameDay
      ? Math.max(APP_START, original.minutes)
      : Math.max(APP_START, timeToMinutes(lesson.time || '09:00'));

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

function lessonLearnerCount(current, lessonId) {
  return (current.learners || []).filter(learner => learner.lesson === lessonId).length;
}

function duplicateLesson(lessonId, copyProgress = false) {
  const current = state();
  const sourceLesson = (current.lessons || []).find(lesson => lesson.id === lessonId);
  if (!sourceLesson) return;

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
    audit: [
      `Copied ${sourceLesson.name || 'class/session'} to ${slot.day} ${formatTime(slot.minutes)}${copyProgress ? ' with names/progress' : ' setup only'}`,
      ...(current.audit || [])
    ]
  };

  persist(nextState);
  closeCopyMenu();
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

function closeCopyMenu() {
  pendingCopyLessonId = '';
  document.querySelector('[data-week-copy-menu]')?.remove();
}

function openCopyMenu(lessonId, anchor) {
  const current = state();
  const lesson = (current.lessons || []).find(lesson => lesson.id === lessonId);
  if (!lesson) return;

  closeCopyMenu();
  pendingCopyLessonId = lessonId;

  const slot = findNextFreeSlot(current.lessons || [], lesson);
  const learnerCount = lessonLearnerCount(current, lessonId);
  const anchorBox = anchor?.getBoundingClientRect?.();
  const useInlinePosition = anchorBox && window.innerWidth > 720;

  const menu = document.createElement('div');
  menu.className = 'week-copy-menu-shell';
  menu.dataset.weekCopyMenu = 'true';
  menu.innerHTML = `
    <div class="week-copy-scrim" data-week-copy-cancel="true"></div>
    <section class="week-copy-menu" role="dialog" aria-modal="true" aria-label="Copy class or session">
      <button class="week-copy-close" type="button" data-week-copy-cancel="true" aria-label="Close copy menu">×</button>
      <p>Copy class/session</p>
      <h2>${escapeHtml(lesson.name || 'Class/session')}</h2>
      <small>Next free slot: <strong>${escapeHtml(slot.day)} ${escapeHtml(formatTime(slot.minutes))}</strong></small>
      <div class="week-copy-choice-grid">
        <button type="button" class="week-copy-choice primary" data-week-copy-choice="setup">
          <span>Copy setup only</span>
          <small>Same activity, time length, venue and criteria group. Names stay empty.</small>
        </button>
        <button type="button" class="week-copy-choice" data-week-copy-choice="full">
          <span>Copy with names</span>
          <small>Copies ${learnerCount} name${learnerCount === 1 ? '' : 's'} plus assessment progress.</small>
        </button>
      </div>
    </section>
  `;

  document.body.appendChild(menu);

  if (useInlinePosition) {
    const dialog = menu.querySelector('.week-copy-menu');
    const top = Math.min(window.innerHeight - 260, Math.max(16, anchorBox.top + 26));
    const left = Math.min(window.innerWidth - 350, Math.max(16, anchorBox.right - 330));
    dialog.style.position = 'fixed';
    dialog.style.top = `${top}px`;
    dialog.style.left = `${left}px`;
    dialog.style.transform = 'none';
  }

  menu.querySelector('[data-week-copy-choice]')?.focus({ preventScroll: true });
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
    .week-copy-menu-shell {
      position: fixed;
      inset: 0;
      z-index: 9999;
      pointer-events: none;
    }
    .week-copy-scrim {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, .18);
      pointer-events: auto;
    }
    .week-copy-menu {
      position: fixed;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: min(92vw, 360px);
      border: 1px solid rgba(15,23,42,.16);
      border-top: 5px solid #f97316;
      border-radius: 20px;
      background: linear-gradient(180deg,#fff8f1,#ffffff);
      box-shadow: 0 24px 70px rgba(15,23,42,.26);
      padding: 16px;
      pointer-events: auto;
      color: #071527;
    }
    .week-copy-menu p {
      margin: 0 0 4px;
      color: #f97316;
      font-size: 12px;
      font-weight: 1000;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .week-copy-menu h2 {
      margin: 0;
      font-size: 20px;
      line-height: 1.12;
    }
    .week-copy-menu > small {
      display: block;
      color: #60738a;
      font-weight: 850;
      margin-top: 6px;
    }
    .week-copy-close {
      position: absolute;
      top: 8px;
      right: 9px;
      width: 30px;
      height: 30px;
      border: 1px solid #d9dee8;
      border-radius: 999px;
      background: #fff;
      color: #071527;
      font-size: 19px;
      font-weight: 1000;
      line-height: 1;
    }
    .week-copy-choice-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 9px;
      margin-top: 14px;
    }
    .week-copy-choice {
      border: 1px solid #dbe7f3;
      background: #fff;
      color: #071527;
      border-radius: 15px;
      padding: 11px;
      text-align: left;
      font-weight: 1000;
      box-shadow: 0 7px 18px rgba(15,23,42,.08);
    }
    .week-copy-choice.primary {
      background: #071527;
      color: #fff;
      border-color: #071527;
      box-shadow: inset 0 -4px 0 #f97316, 0 10px 20px rgba(15,23,42,.16);
    }
    .week-copy-choice span {
      display: block;
      font-size: 15px;
    }
    .week-copy-choice small {
      display: block;
      margin-top: 4px;
      color: #60738a;
      font-size: 12px;
      font-weight: 850;
      line-height: 1.22;
    }
    .week-copy-choice.primary small {
      color: #dff4ff;
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
      .week-copy-menu {
        top: auto !important;
        left: 10px !important;
        right: 10px !important;
        bottom: 12px;
        width: auto;
        transform: none !important;
        border-radius: 22px;
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

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeCopyMenu();
  }, true);

  document.addEventListener('click', event => {
    const choice = event.target.closest('[data-week-copy-choice]');
    if (choice) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      duplicateLesson(pendingCopyLessonId, choice.dataset.weekCopyChoice === 'full');
      return;
    }

    if (event.target.closest('[data-week-copy-cancel]')) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      closeCopyMenu();
      return;
    }

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
    openCopyMenu(card.dataset.lessonId, handle);
  }, true);
}

installListeners();
window.addEventListener('load', enhanceCalendar);
new MutationObserver(enhanceCalendar).observe(document.documentElement, { childList: true, subtree: true });
setTimeout(enhanceCalendar, 250);
setTimeout(enhanceCalendar, 900);
