const KEY = 'stageflow-state';

export function loadAppState(fallback) {
  try {
    const text = window.localStorage.getItem(KEY);
    if (!text) return fallback;
    const saved = JSON.parse(text);
    return normaliseState(saved, fallback);
  } catch {
    return fallback;
  }
}

export function saveAppState(state) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Local storage can fail in private browsing or locked-down devices.
  }
}

export function clearAppState() {
  window.localStorage.removeItem(KEY);
}

function mergeUnique(base = [], extra = []) {
  return [...base, ...extra.filter(item => !base.includes(item))];
}

function mergeGroupTemplates(savedGroups = [], fallbackGroups = []) {
  const savedById = new Map(savedGroups.map(group => [group.id, group]));
  const mergedDefaults = fallbackGroups.map(group => {
    const saved = savedById.get(group.id);
    if (!saved) return group;
    return {
      ...group,
      ...saved,
      // Keep the official/default stage order first, then append any custom stages.
      stages: mergeUnique(group.stages || [], saved.stages || [])
    };
  });
  const customGroups = savedGroups.filter(group => !fallbackGroups.some(fallback => fallback.id === group.id));
  return [...mergedDefaults, ...customGroups];
}

function inferProgramme(lesson, fallbackProgramme) {
  if (lesson.programme) return lesson.programme;
  const text = `${lesson.school || ''} ${lesson.name || ''} ${lesson.year || ''}`.toLowerCase();
  if (text.includes('evening')) return 'Evening Swim Lessons';
  if (text.includes('private')) return 'Private Lessons';
  if (text.includes('gym')) return 'Gymnastics';
  if (text.includes('pe')) return 'School PE';
  return fallbackProgramme || 'School Swimming';
}

export function normaliseState(saved, fallback) {
  const base = { ...fallback, ...(saved || {}) };
  const framework = {
    ...(fallback.framework || {}),
    ...(base.framework || {})
  };

  // Keep the latest app/framework order first so saved older data cannot put
  // Self Rescue / Water Safety in the middle of numbered stages.
  framework.stages = mergeUnique(
    fallback.framework?.stages || [],
    framework.stages?.length ? framework.stages : []
  );
  framework.criteria = { ...(fallback.framework.criteria || {}), ...(framework.criteria || {}) };
  framework.groupTemplates = mergeGroupTemplates(
    framework.groupTemplates?.length ? framework.groupTemplates : [],
    fallback.framework?.groupTemplates || []
  );
  framework.groups = framework.groupTemplates?.length
    ? framework.groupTemplates.map(g => `${g.name}: ${g.detail || ''}`)
    : framework.groups || [];

  const lessons = Array.isArray(base.lessons) ? base.lessons : fallback.lessons;
  const safeLessons = lessons.map((lesson, index) => ({
    id: lesson.id || `lesson-${index}`,
    day: lesson.day || base.currentDay || fallback.currentDay || 'Tuesday',
    time: lesson.time || '09:00',
    duration: Number(lesson.duration) || 30,
    programme: inferProgramme(lesson, framework.area || fallback.framework?.area),
    school: lesson.school || 'School / Venue',
    year: lesson.year || 'Year group',
    className: lesson.className || '',
    coach: lesson.coach || '',
    name: lesson.name || 'Untitled lesson',
    groupTemplateId: lesson.groupTemplateId || framework.groupTemplates?.[0]?.id || '',
    mode: lesson.mode || framework.mode || 'Stages + National Curriculum'
  }));

  const learners = Array.isArray(base.learners) ? base.learners : fallback.learners;
  const safeLearners = learners.map((learner, index) => ({
    id: learner.id || `learner-${index}`,
    lesson: learner.lesson || safeLessons[0]?.id || '',
    name: learner.name || 'Unnamed learner',
    stage: learner.stage || framework.stages?.[0] || 'Stage 1',
    att: learner.att || 'Present',
    res: learner.res || {},
    dist: learner.dist || { front: '0m', back: '0m' },
    nc: learner.nc || {}
  }));

  return {
    ...base,
    framework,
    lessons: safeLessons,
    learners: safeLearners,
    certificates: Array.isArray(base.certificates) ? base.certificates : fallback.certificates,
    staff: Array.isArray(base.staff) ? base.staff : fallback.staff,
    pack: { ...(fallback.pack || {}), ...(base.pack || {}) },
    audit: Array.isArray(base.audit) ? base.audit : fallback.audit,
    currentDay: base.currentDay || fallback.currentDay || 'Tuesday',
    timetableFilter: base.timetableFilter || fallback.timetableFilter || 'All',
    draft: base.draft || null,
    active: base.active || safeLessons[0]?.id || '',
    selected: base.selected || '',
    screen: base.screen || 'home',
    step: base.step || 'list',
    tab: base.tab || 'framework'
  };
}
