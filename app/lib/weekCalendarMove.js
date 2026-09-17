import { demoFramework, demoLearners, demoLessons } from '../data/demoData.js';
import { loadAppState, saveAppState } from './localStore.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const APP_START = 7 * 60;
const APP_END = 21 * 60;
const SLOT_MINUTES = 30;
const MOVE_STEP_MINUTES = 15;

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

let moveSession = null;
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
  const hours = String(Math.floor(safe / 60)).padStart(2, '0');
  const minutes = String(safe % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function roundedToStep(minutes) {
  return Math.round((Number(minutes) || 0) / MOVE_STEP_MINUTES) * MOVE_STEP_MINUTES;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function programmeName(lesson = {}) {
  const value = String(lesson.programme || '').trim();
  if (value === 'Evening Swim Lessons') return 'Evening Swim Group';
  if (['Evening Swim 121', 'Evening 1:1', 'Evening Swim One-to-one'].includes(value)) return 'Evening Swim 1:1';
  if (value) return value;
  const combined = `${lesson.school || ''} ${lesson.name || ''} ${lesson.year || ''} ${lesson.className || ''}`.toLowerCase();
  if (combined.includes('1:1') || combined.includes('121') || combined.includes('one to one') || combined.includes('one-to-one')) return 'Evening Swim 1:1';
  if (combined.includes('evening')) return 'Evening Swim Group';
  if (combined.includes('private')) return 'Private Lessons';
  if (combined.includes('gym')) return 'Gymnastics';
  if (combined.includes('pe')) return 'School PE';
  return 'School Swimming';
}

function currentCalendarRange(grid) {
  const firstTime = grid.querySelector('.week-time')?.textContent?.trim();
  const rows = Array.from(grid.querySelectorAll('.week-time'));
  const start = firstTime ? timeToMinutes(firstTime) : 8 * 60;
  const end = rows.length ? start + rows.length * SLOT_MINUTES : 19 * 60;
  return { start, end };
}

function parseTemplateTrackList(trackList) {
  return String(trackList || '')
    .split(' ')
    .map(part => Number.parseFloat(part))
    .filter(Number.isFinite);
}

function gridMetrics(grid) {
  const style = window.getComputedStyle(grid);
  const rect = grid.getBoundingClientRect();
  const columns = parseTemplateTrackList(style.gridTemplateColumns);
  const rows = parseTemplateTrackList(style.gridTemplateRows);
  const timeColumnWidth = columns[0] || 66;
  const dayWidth = columns.length >= 6
    ? columns.slice(1, 6).reduce((sum, width) => sum + width, 0) / 5
    : Math.max(120, (rect.width - timeColumnWidth) / 5);
  const headerHeight = rows[0] || 50;
  const rawSlotHeight = window.getComputedStyle(grid).getPropertyValue('--week-slot-height').trim();
  const slotHeight = Number(String(rawSlotHeight).replace('px', '')) || rows[1] || 44;
  const range = currentCalendarRange(grid);
  return { rect, timeColumnWidth, dayWidth, headerHeight, slotHeight, ...range };
}

function targetFromPoint(grid, clientX, clientY, duration) {
  const metrics = gridMetrics(grid);
  const x = clientX - metrics.rect.left;
  const y = clientY - metrics.rect.top;
  const dayIndex = clamp(Math.floor((x - metrics.timeColumnWidth) / metrics.dayWidth), 0, DAYS.length - 1);
  const rawMinutes = metrics.start + ((y - metrics.headerHeight) / metrics.slotHeight) * SLOT_MINUTES;
  const latestStart = Math.max(APP_START, Math.min(APP_END - duration, metrics.end - duration));
  const minutes = clamp(roundedToStep(rawMinutes), metrics.start, latestStart);
  return {
    day: DAYS[dayIndex],
    minutes,
    row: 2 + Math.max(0, Math.round((minutes - metrics.start) / SLOT_MINUTES)),
    column: 2 + dayIndex
  };
}

function lessonById(lessonId) {
  return (state().lessons || []).find(lesson => lesson.id === lessonId);
}

function setPreview(card, target, duration) {
  card.style.gridColumn = `${target.column}`;
  const rowSpan = Math.max(1, Math.ceil(duration / SLOT_MINUTES));
  card.style.gridRow = `${target.row} / span ${rowSpan}`;
  card.dataset.previewDay = target.day;
  card.dataset.previewTime = formatTime(target.minutes);

  const time = card.querySelector('.week-event-time');
  if (time) time.textContent = `${formatTime(target.minutes)}–${formatTime(target.minutes + duration)}`;

  let preview = card.querySelector('.week-move-preview');
  if (!preview) {
    preview = document.createElement('span');
    preview.className = 'week-move-preview';
    card.appendChild(preview);
  }
  preview.textContent = `${target.day.slice(0, 3)} ${formatTime(target.minutes)}`;
}

function autoScrollCalendar(grid, clientX, clientY) {
  const scroll = grid.closest('.week-calendar-scroll');
  if (!scroll) return;
  const rect = scroll.getBoundingClientRect();
  if (clientX > rect.right - 36) scroll.scrollLeft += 18;
  if (clientX < rect.left + 36) scroll.scrollLeft -= 18;
  if (clientY > rect.bottom - 36) scroll.scrollTop += 18;
  if (clientY < rect.top + 36) scroll.scrollTop -= 18;
}

function startMove(event, card, lessonId) {
  const lesson = lessonById(lessonId);
  const grid = card.closest('.week-calendar-grid');
  if (!lesson || !grid) return;

  const duration = Number(lesson.duration) || SLOT_MINUTES;
  const originalDay = lesson.day || 'Tuesday';
  const originalMinutes = timeToMinutes(lesson.time || '09:00');
  moveSession = {
    lessonId,
    card,
    grid,
    startX: event.clientX,
    startY: event.clientY,
    originalDay,
    originalMinutes,
    duration,
    targetDay: originalDay,
    targetMinutes: originalMinutes,
    moved: false
  };

  event.preventDefault();
  event.stopPropagation();
  card.setPointerCapture?.(event.pointerId);
  window.addEventListener('pointermove', moveLesson, { passive: false });
  window.addEventListener('pointerup', finishMove, { once: true });
}

function moveLesson(event) {
  if (!moveSession) return;
  event.preventDefault();
  const dx = event.clientX - moveSession.startX;
  const dy = event.clientY - moveSession.startY;
  if (Math.hypot(dx, dy) > 5) moveSession.moved = true;
  autoScrollCalendar(moveSession.grid, event.clientX, event.clientY);

  const target = targetFromPoint(moveSession.grid, event.clientX, event.clientY, moveSession.duration);
  moveSession.targetDay = target.day;
  moveSession.targetMinutes = target.minutes;
  moveSession.card.classList.add('moving');
  setPreview(moveSession.card, target, moveSession.duration);
}

function forceCalendarRerender() {
  const calendar = document.querySelector('[data-stageflow-week-calendar]');
  if (calendar) calendar.remove();
  window.setTimeout(enhanceCalendar, 160);
  window.setTimeout(enhanceCalendar, 420);
}

function finishMove() {
  if (!moveSession) return;
  const session = moveSession;
  moveSession = null;
  window.removeEventListener('pointermove', moveLesson);
  session.card.classList.remove('moving');
  suppressClickUntil = Date.now() + 350;

  if (!session.moved) {
    enhanceCalendar();
    return;
  }

  const nextDay = session.targetDay;
  const nextTime = formatTime(session.targetMinutes);
  const changed = nextDay !== session.originalDay || session.targetMinutes !== session.originalMinutes;
  if (changed) {
    const current = state();
    const lessons = (current.lessons || []).map(lesson => lesson.id === session.lessonId
      ? { ...lesson, day: nextDay, time: nextTime }
      : lesson
    );
    persist({ ...current, lessons, currentDay: nextDay });
    showToast(`Moved to ${nextDay} ${nextTime}`);
    forceCalendarRerender();
  } else {
    enhanceCalendar();
  }
}

function showToast(message) {
  const existing = document.querySelector('[data-week-move-toast]');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'week-calendar-toast week-move-toast';
  toast.dataset.weekMoveToast = 'true';
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 1800);
}

function addMoveHandle(card) {
  if (card.querySelector('[data-week-move]')) return;
  const handle = document.createElement('span');
  handle.className = 'week-move-handle';
  handle.dataset.weekMove = 'true';
  handle.title = 'Drag to move lesson';
  handle.setAttribute('aria-hidden', 'true');
  handle.textContent = 'Move';
  card.appendChild(handle);
}

function addStyles() {
  if (document.getElementById('stageflow-week-move-style')) return;
  const style = document.createElement('style');
  style.id = 'stageflow-week-move-style';
  style.textContent = `
    .week-move-handle {
      position: absolute;
      right: 7px;
      top: 5px;
      z-index: 3;
      border: 1px solid rgba(255,255,255,.26);
      background: rgba(255,255,255,.18);
      color: #fff;
      border-radius: 999px;
      padding: 2px 6px;
      font-size: 9px;
      line-height: 1;
      font-weight: 1000;
      cursor: grab;
      touch-action: none;
      box-shadow: 0 4px 10px rgba(15,23,42,.14);
    }
    .week-event:hover .week-move-handle,
    .week-event.moving .week-move-handle {
      background: #fff;
      color: #071527;
    }
    .week-event.moving {
      z-index: 11 !important;
      opacity: .94;
      transform: scale(1.025) !important;
      filter: saturate(1.2);
      box-shadow: 0 20px 42px rgba(15,23,42,.32) !important;
      cursor: grabbing;
      outline: 3px solid rgba(249,115,22,.36);
      outline-offset: -3px;
    }
    .week-move-preview {
      position: absolute;
      left: 8px;
      bottom: 4px;
      border-radius: 999px;
      background: rgba(255,255,255,.2);
      border: 1px solid rgba(255,255,255,.18);
      padding: 1px 5px;
      font-size: 9px;
      font-weight: 1000;
      color: #fff;
      pointer-events: none;
    }
    .week-event.moving .week-resize-label {
      display: none;
    }
    @media(max-width:850px) {
      .week-move-handle {
        top: 4px;
        right: 5px;
        padding: 3px 7px;
        font-size: 9px;
      }
      .week-event strong {
        padding-right: 38px;
      }
    }
  `;
  document.head.appendChild(style);
}

function enhanceCalendar() {
  addStyles();
  document.querySelectorAll('.week-event[data-lesson-id]').forEach(addMoveHandle);
  const headText = document.querySelector('[data-stageflow-week-calendar] .week-calendar-head span');
  if (headText && !headText.textContent.includes('drag Move')) {
    headText.textContent = headText.textContent.replace('drag bottom edge to resize', 'drag Move to reschedule · drag bottom edge to resize');
  }
  document.querySelectorAll('[data-stageflow-week-calendar] .week-calendar-key span').forEach(span => {
    if (span.textContent === 'Bottom grip = change duration') span.textContent = 'Move = change day/time';
  });
  const key = document.querySelector('[data-stageflow-week-calendar] .week-calendar-key');
  if (key && !key.querySelector('[data-week-move-key]')) {
    const item = document.createElement('span');
    item.dataset.weekMoveKey = 'true';
    item.textContent = 'Bottom grip = change duration';
    key.appendChild(item);
  }
}

function installListeners() {
  if (window.__stageFlowWeekMoveInstalled) return;
  window.__stageFlowWeekMoveInstalled = true;

  document.addEventListener('pointerdown', event => {
    const handle = event.target.closest('[data-week-move]');
    if (!handle) return;
    const card = handle.closest('.week-event[data-lesson-id]');
    if (!card) return;
    startMove(event, card, card.dataset.lessonId);
  }, true);

  document.addEventListener('click', event => {
    if (event.target.closest('[data-week-move]') || Date.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, true);
}

installListeners();
window.addEventListener('load', enhanceCalendar);
new MutationObserver(enhanceCalendar).observe(document.documentElement, { childList: true, subtree: true });
setTimeout(enhanceCalendar, 250);
setTimeout(enhanceCalendar, 900);
