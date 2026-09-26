const APP_KEY = 'stageflow-state';
const CERT_REQUEST_KEY = 'stageflow-certificate-requests';
const BACKUP_KEYS = [
  'stageflow-state',
  'stageflow-certificate-requests',
  'stageflow-progression-report-filter',
  'stageflow-report-filters',
  'stageflow-launch-readiness',
  'stageflow-poolside-filter'
];

const KNOWN_PROGRAMMES = ['School Swimming', 'Evening Swim Group', 'Evening Swim 1:1', 'Private Lessons', 'School PE', 'Gymnastics', 'Custom'];
const PROGRAMME_GROUPS = {
  'School Swimming': ['g1', 'g2', 'g3'],
  'Evening Swim Group': ['eg1', 'eg2', 'eg3'],
  'Evening Swim 1:1': ['eg121'],
  'Private Lessons': ['eg121'],
  'School PE': ['pe-fund', 'pe-games', 'pe-team'],
  Gymnastics: ['gym-beg', 'gym-imp', 'gym-adv']
};

function loadJson(key, fallback) {
  try {
    const text = window.localStorage.getItem(key);
    return text ? JSON.parse(text) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function state() {
  return loadJson(APP_KEY, null);
}

function certRequests() {
  const value = loadJson(CERT_REQUEST_KEY, []);
  return Array.isArray(value) ? value : [];
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function unique(values) {
  return [...new Set((values || []).filter(value => value !== undefined && value !== null && value !== ''))];
}

function normaliseProgramme(value) {
  const text = String(value || '').trim();
  const low = text.toLowerCase();
  if (!text) return 'School Swimming';
  if (low === 'evening swim lessons' || low === 'evening lessons') return 'Evening Swim Group';
  if (low.includes('evening') && (low.includes('1:1') || low.includes('121') || low.includes('one-to-one') || low.includes('one to one'))) return 'Evening Swim 1:1';
  if (low.includes('evening')) return 'Evening Swim Group';
  if (low.includes('private')) return 'Private Lessons';
  if (low.includes('gym')) return 'Gymnastics';
  if (low === 'pe' || low.includes('school pe') || low.includes('physical education')) return 'School PE';
  if (low.includes('school') && low.includes('swim')) return 'School Swimming';
  return KNOWN_PROGRAMMES.includes(text) ? text : text;
}

function inferGroupProgramme(group = {}) {
  const explicit = normaliseProgramme(group.programme || '');
  if (group.programme) return explicit;
  const id = String(group.id || '');
  const name = `${group.name || ''} ${group.detail || ''} ${(group.stages || []).join(' ')}`.toLowerCase();
  if (id.startsWith('eg121')) return 'Evening Swim 1:1';
  if (id.startsWith('eg')) return 'Evening Swim Group';
  if (id.startsWith('gym') || name.includes('gymnastics')) return 'Gymnastics';
  if (id.startsWith('pe-') || name.includes('pe ') || name.includes('games skills') || name.includes('teamwork')) return 'School PE';
  if (id.startsWith('g')) return 'School Swimming';
  return 'Custom';
}

function lessonProgramme(lesson = {}, groupsById = {}) {
  if (lesson.programme) return normaliseProgramme(lesson.programme);
  const groupProgramme = groupsById[lesson.groupTemplateId]?.programme;
  if (groupProgramme) return normaliseProgramme(groupProgramme);
  const text = `${lesson.school || ''} ${lesson.name || ''} ${lesson.year || ''} ${lesson.className || ''}`.toLowerCase();
  if (text.includes('1:1') || text.includes('121') || text.includes('one-to-one') || text.includes('one to one')) return 'Evening Swim 1:1';
  if (text.includes('evening')) return 'Evening Swim Group';
  if (text.includes('private')) return 'Private Lessons';
  if (text.includes('gym')) return 'Gymnastics';
  if (text.includes('pe')) return 'School PE';
  return 'School Swimming';
}

function arraysEqual(a = [], b = []) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function allCriteriaSet(app) {
  return new Set(Object.values(app?.framework?.criteria || {}).flat());
}

function groupTemplates(app) {
  return Array.isArray(app?.framework?.groupTemplates) ? app.framework.groupTemplates : [];
}

function groupsById(app) {
  return Object.fromEntries(groupTemplates(app).filter(group => group?.id).map(group => [group.id, group]));
}

function criteriaForLesson(app, lesson) {
  const group = groupsById(app)[lesson?.groupTemplateId];
  if (!group || !Array.isArray(group.stages)) return [];
  const criteria = app?.framework?.criteria || {};
  return unique(group.stages.flatMap(stage => criteria[stage] || []));
}

function nextDefaultGroupForProgramme(app, programme) {
  const groups = groupTemplates(app);
  const wantedIds = PROGRAMME_GROUPS[programme] || [];
  return groups.find(group => wantedIds.includes(group.id))?.id
    || groups.find(group => normaliseProgramme(group.programme || inferGroupProgramme(group)) === programme)?.id
    || groups[0]?.id
    || '';
}

function stageHasCriteria(app, stage) {
  return Array.isArray(app?.framework?.criteria?.[stage]) && app.framework.criteria[stage].length > 0;
}

function analyseHealth(app = state()) {
  const issues = [];
  if (!app || typeof app !== 'object') {
    issues.push({ id: 'missing-state', severity: 'danger', title: 'No saved app state found', detail: 'Stage Flow has not saved local app data on this device yet. Create or edit a class/session, then run this check again.', fix: null });
    return { issues, stats: { lessons: 0, learners: 0, groups: 0, certificates: certRequests().length }, score: 0 };
  }

  const lessons = Array.isArray(app.lessons) ? app.lessons : [];
  const learners = Array.isArray(app.learners) ? app.learners : [];
  const groups = groupTemplates(app);
  const byGroup = groupsById(app);
  const lessonIds = new Set(lessons.map(lesson => lesson.id).filter(Boolean));
  const learnerIds = new Set(learners.map(learner => learner.id).filter(Boolean));
  const stages = Array.isArray(app?.framework?.stages) ? app.framework.stages : [];
  const stageSet = new Set(stages);
  const allCriteria = allCriteriaSet(app);
  const requests = certRequests();

  if (!Array.isArray(app.lessons)) issues.push({ id: 'lessons-array', severity: 'danger', title: 'Lessons list is not valid', detail: 'The saved lessons field is missing or not an array.', fix: null });
  if (!Array.isArray(app.learners)) issues.push({ id: 'learners-array', severity: 'danger', title: 'Learner list is not valid', detail: 'The saved learners field is missing or not an array.', fix: null });
  if (!groups.length) issues.push({ id: 'groups-missing', severity: 'danger', title: 'No criteria groups found', detail: 'Lessons need criteria groups before assessment can work.', fix: null });

  const oldProgrammeLessons = lessons.filter(lesson => lesson.programme && lesson.programme !== normaliseProgramme(lesson.programme));
  if (oldProgrammeLessons.length) issues.push({ id: 'old-programme-labels', severity: 'warn', title: 'Old programme labels found', detail: `${oldProgrammeLessons.length} class/session(s) still use older wording such as Evening Swim Lessons.`, fix: 'normalise-labels' });

  const groupProgrammeMissing = groups.filter(group => !group.programme || group.programme !== normaliseProgramme(group.programme));
  if (groupProgrammeMissing.length) issues.push({ id: 'group-programmes', severity: 'warn', title: 'Criteria groups need activity labels', detail: `${groupProgrammeMissing.length} criteria group(s) are missing or using old activity/programme labels.`, fix: 'normalise-labels' });

  const missingGroupLessons = lessons.filter(lesson => !lesson.groupTemplateId || !byGroup[lesson.groupTemplateId]);
  if (missingGroupLessons.length) issues.push({ id: 'missing-groups', severity: 'danger', title: 'Sessions point at missing criteria groups', detail: `${missingGroupLessons.length} class/session(s) have no valid criteria group selected.`, fix: 'repair-groups' });

  const mismatchedGroupLessons = lessons.filter(lesson => {
    const group = byGroup[lesson.groupTemplateId];
    if (!group) return false;
    const programme = lessonProgramme(lesson, byGroup);
    const groupProgramme = normaliseProgramme(group.programme || inferGroupProgramme(group));
    if (programme === 'Private Lessons' && group.id === 'eg121') return false;
    if (programme === 'Custom') return false;
    return groupProgramme !== 'Custom' && programme !== groupProgramme;
  });
  if (mismatchedGroupLessons.length) issues.push({ id: 'programme-group-mismatch', severity: 'warn', title: 'Activity and criteria group do not match', detail: `${mismatchedGroupLessons.length} class/session(s) use a criteria group from a different activity.`, fix: 'repair-groups' });

  const emptyGroups = groups.filter(group => !Array.isArray(group.stages) || group.stages.length === 0);
  if (emptyGroups.length) issues.push({ id: 'empty-groups', severity: 'warn', title: 'Criteria groups with no sections', detail: `${emptyGroups.length} criteria group(s) have no criteria sections selected.`, fix: null });

  const groupsWithMissingStages = groups.filter(group => (group.stages || []).some(stage => !stageSet.has(stage)));
  if (groupsWithMissingStages.length) issues.push({ id: 'missing-group-stages', severity: 'danger', title: 'Criteria groups include missing sections', detail: `${groupsWithMissingStages.length} criteria group(s) reference sections that are no longer in the framework.`, fix: 'repair-framework' });

  const emptyCriteriaStages = stages.filter(stage => !stageHasCriteria(app, stage));
  if (emptyCriteriaStages.length) issues.push({ id: 'empty-criteria-sections', severity: 'warn', title: 'Criteria sections with no criteria', detail: `${emptyCriteriaStages.length} section(s) exist but have no criteria written.`, fix: null });

  const orphanLearners = learners.filter(learner => !lessonIds.has(learner.lesson));
  if (orphanLearners.length) issues.push({ id: 'orphan-learners', severity: 'danger', title: 'Learners linked to deleted sessions', detail: `${orphanLearners.length} learner record(s) point at a class/session that no longer exists.`, fix: 'clean-orphans' });

  const incompleteLearners = learners.filter(learner => !learner.id || !learner.name || !learner.lesson || !learner.att);
  if (incompleteLearners.length) issues.push({ id: 'incomplete-learners', severity: 'warn', title: 'Learner records are missing fields', detail: `${incompleteLearners.length} learner record(s) are missing a name, lesson, attendance or id.`, fix: 'repair-learner-basics' });

  const duplicateNames = [];
  const namesByLesson = new Map();
  learners.forEach(learner => {
    const key = `${learner.lesson}::${String(learner.name || '').trim().toLowerCase()}`;
    if (!learner.name) return;
    if (namesByLesson.has(key)) duplicateNames.push(learner);
    namesByLesson.set(key, learner);
  });
  if (duplicateNames.length) issues.push({ id: 'duplicate-names', severity: 'info', title: 'Possible duplicate names', detail: `${duplicateNames.length} learner name(s) appear more than once in the same class/session.`, fix: null });

  const invalidLearnerStages = learners.filter(learner => learner.stage && !stageSet.has(learner.stage));
  if (invalidLearnerStages.length) issues.push({ id: 'learner-stages', severity: 'warn', title: 'Learners have old/missing stage labels', detail: `${invalidLearnerStages.length} learner record(s) use a stage/section that is not in the current framework.`, fix: 'repair-learner-basics' });

  const staleResultLearners = learners.filter(learner => Object.keys(learner.res || {}).some(criteria => !allCriteria.has(criteria)));
  if (staleResultLearners.length) issues.push({ id: 'stale-results', severity: 'info', title: 'Old assessment criteria stored', detail: `${staleResultLearners.length} learner record(s) contain results for criteria no longer in the framework.`, fix: 'clean-results' });

  const noCriteriaLessons = lessons.filter(lesson => String(lesson.mode || '').toLowerCase() !== 'national curriculum only' && criteriaForLesson(app, lesson).length === 0);
  if (noCriteriaLessons.length) issues.push({ id: 'lesson-no-criteria', severity: 'danger', title: 'Sessions cannot calculate criteria', detail: `${noCriteriaLessons.length} class/session(s) currently show zero criteria.`, fix: 'repair-groups' });

  const duplicateLessonIds = findDuplicateIds(lessons);
  const duplicateLearnerIds = findDuplicateIds(learners);
  const duplicateGroupIds = findDuplicateIds(groups);
  if (duplicateLessonIds + duplicateLearnerIds + duplicateGroupIds > 0) issues.push({ id: 'duplicate-ids', severity: 'danger', title: 'Duplicate internal IDs found', detail: `${duplicateLessonIds + duplicateLearnerIds + duplicateGroupIds} duplicate id issue(s) could cause the app to open or save the wrong record.`, fix: 'repair-ids' });

  const orphanRequests = requests.filter(request => request.learnerId && !learnerIds.has(request.learnerId));
  if (orphanRequests.length) issues.push({ id: 'orphan-certificate-requests', severity: 'warn', title: 'Certificate requests linked to missing learners', detail: `${orphanRequests.length} certificate request(s) point at learners no longer in the app.`, fix: 'clean-certificates' });

  const oldRequestProgrammes = requests.filter(request => request.programme && request.programme !== normaliseProgramme(request.programme));
  if (oldRequestProgrammes.length) issues.push({ id: 'old-certificate-programmes', severity: 'warn', title: 'Certificate requests use old programme labels', detail: `${oldRequestProgrammes.length} certificate request(s) still use older programme wording.`, fix: 'clean-certificates' });

  const backupPossible = storageWritable();
  if (!backupPossible) issues.push({ id: 'storage-blocked', severity: 'warn', title: 'Local storage may be blocked', detail: 'The browser did not allow a small test write to local storage. Backups and saves may fail on this device.', fix: null });

  const dangerCount = issues.filter(issue => issue.severity === 'danger').length;
  const warnCount = issues.filter(issue => issue.severity === 'warn').length;
  const score = Math.max(0, Math.round(100 - (dangerCount * 22) - (warnCount * 10) - (issues.filter(issue => issue.severity === 'info').length * 3)));
  return {
    issues,
    score,
    stats: {
      lessons: lessons.length,
      learners: learners.length,
      groups: groups.length,
      certificates: requests.length,
      dangerCount,
      warnCount,
      fixableCount: issues.filter(issue => issue.fix).length
    }
  };
}

function storageWritable() {
  try {
    const key = 'stageflow-health-write-test';
    window.localStorage.setItem(key, '1');
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function findDuplicateIds(items) {
  const seen = new Set();
  let duplicates = 0;
  (items || []).forEach(item => {
    if (!item?.id) return;
    if (seen.has(item.id)) duplicates += 1;
    seen.add(item.id);
  });
  return duplicates;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function withAudit(app, message) {
  return {
    ...app,
    audit: [`${message} · ${new Date().toLocaleString('en-GB')}`, ...(Array.isArray(app.audit) ? app.audit : [])].slice(0, 50)
  };
}

function repairLabels(app) {
  const copy = clone(app);
  copy.lessons = (copy.lessons || []).map(lesson => ({ ...lesson, programme: lessonProgramme(lesson, groupsById(copy)) }));
  copy.framework = copy.framework || {};
  copy.framework.groupTemplates = groupTemplates(copy).map(group => ({ ...group, programme: normaliseProgramme(group.programme || inferGroupProgramme(group)) }));
  const requests = certRequests().map(request => ({ ...request, programme: normaliseProgramme(request.programme) }));
  saveJson(CERT_REQUEST_KEY, requests);
  return withAudit(copy, 'Data Health fixed old programme labels');
}

function repairGroups(app) {
  const copy = repairLabels(app);
  const byGroup = groupsById(copy);
  copy.lessons = (copy.lessons || []).map(lesson => {
    const programme = lessonProgramme(lesson, byGroup);
    const group = byGroup[lesson.groupTemplateId];
    const groupProgramme = group ? normaliseProgramme(group.programme || inferGroupProgramme(group)) : '';
    const mismatch = group && programme !== 'Custom' && !(programme === 'Private Lessons' && group.id === 'eg121') && groupProgramme !== 'Custom' && programme !== groupProgramme;
    if (!group || mismatch) {
      return { ...lesson, programme, groupTemplateId: nextDefaultGroupForProgramme(copy, programme) };
    }
    return { ...lesson, programme };
  });
  return withAudit(copy, 'Data Health reconnected missing criteria groups');
}

function repairFramework(app) {
  const copy = clone(app);
  copy.framework = copy.framework || {};
  const criteria = copy.framework.criteria || {};
  const stages = unique([...(Array.isArray(copy.framework.stages) ? copy.framework.stages : []), ...Object.keys(criteria)]);
  copy.framework.stages = stages;
  copy.framework.groupTemplates = groupTemplates(copy).map(group => ({
    ...group,
    programme: normaliseProgramme(group.programme || inferGroupProgramme(group)),
    stages: unique(group.stages || []).filter(stage => stages.includes(stage))
  }));
  return withAudit(copy, 'Data Health repaired framework section links');
}

function cleanOrphans(app) {
  const copy = clone(app);
  const lessonIds = new Set((copy.lessons || []).map(lesson => lesson.id));
  copy.learners = (copy.learners || []).filter(learner => lessonIds.has(learner.lesson));
  return withAudit(copy, 'Data Health removed orphan learner records');
}

function repairLearnerBasics(app) {
  const copy = clone(app);
  const lessons = copy.lessons || [];
  const stages = new Set(copy?.framework?.stages || []);
  const byGroup = groupsById(copy);
  copy.learners = (copy.learners || []).map((learner, index) => {
    const lesson = lessons.find(item => item.id === learner.lesson) || lessons[0] || {};
    const group = byGroup[lesson.groupTemplateId];
    const fallbackStage = group?.stages?.[0] || copy?.framework?.stages?.[0] || 'Stage 1';
    return {
      id: learner.id || `p-health-${Date.now()}-${index}`,
      name: learner.name || 'Unnamed learner',
      lesson: learner.lesson && lessons.some(item => item.id === learner.lesson) ? learner.lesson : lesson.id,
      stage: learner.stage && stages.has(learner.stage) ? learner.stage : fallbackStage,
      att: learner.att || 'Present',
      res: learner.res || {},
      dist: learner.dist || { front: '0m', back: '0m' },
      nc: learner.nc || {},
      breathing: learner.breathing || {}
    };
  });
  return withAudit(copy, 'Data Health repaired learner basics');
}

function cleanResults(app) {
  const copy = clone(app);
  const validCriteria = allCriteriaSet(copy);
  copy.learners = (copy.learners || []).map(learner => ({
    ...learner,
    res: Object.fromEntries(Object.entries(learner.res || {}).filter(([criteria]) => validCriteria.has(criteria)))
  }));
  return withAudit(copy, 'Data Health cleaned stale assessment results');
}

function repairIds(app) {
  const copy = clone(app);
  copy.lessons = repairDuplicateIds(copy.lessons || [], 'l');
  copy.learners = repairDuplicateIds(copy.learners || [], 'p');
  copy.framework = copy.framework || {};
  copy.framework.groupTemplates = repairDuplicateIds(groupTemplates(copy), 'g');
  return withAudit(copy, 'Data Health repaired duplicate internal ids');
}

function repairDuplicateIds(items, prefix) {
  const seen = new Set();
  return (items || []).map((item, index) => {
    if (!item.id || seen.has(item.id)) {
      const id = `${prefix}-health-${Date.now()}-${index}`;
      seen.add(id);
      return { ...item, id };
    }
    seen.add(item.id);
    return item;
  });
}

function cleanCertificates(app) {
  const copy = clone(app || {});
  const learnerIds = new Set((copy.learners || []).map(learner => learner.id));
  const next = certRequests()
    .filter(request => !request.learnerId || learnerIds.has(request.learnerId))
    .map(request => ({ ...request, programme: normaliseProgramme(request.programme) }));
  saveJson(CERT_REQUEST_KEY, next);
  return withAudit(copy, 'Data Health cleaned certificate request links');
}

function runFix(action) {
  const app = state();
  if (!app) return;
  const actionLabel = {
    'normalise-labels': 'fix old programme labels',
    'repair-groups': 'reconnect missing/mismatched criteria groups',
    'repair-framework': 'repair framework section links',
    'clean-orphans': 'remove learner records linked to deleted sessions',
    'repair-learner-basics': 'repair learner basics',
    'clean-results': 'clean old assessment results',
    'repair-ids': 'repair duplicate internal IDs',
    'clean-certificates': 'clean certificate request links',
    'safe-fixes': 'run all safe data-health fixes'
  }[action] || 'run this fix';
  if (!window.confirm(`Before you ${actionLabel}, download a backup first. Continue with this fix now?`)) return;

  let next = app;
  if (action === 'normalise-labels') next = repairLabels(next);
  if (action === 'repair-groups') next = repairGroups(next);
  if (action === 'repair-framework') next = repairFramework(next);
  if (action === 'clean-orphans') next = cleanOrphans(next);
  if (action === 'repair-learner-basics') next = repairLearnerBasics(next);
  if (action === 'clean-results') next = cleanResults(next);
  if (action === 'repair-ids') next = repairIds(next);
  if (action === 'clean-certificates') next = cleanCertificates(next);
  if (action === 'safe-fixes') {
    next = repairLabels(next);
    next = repairFramework(next);
    next = repairGroups(next);
    next = repairLearnerBasics(next);
    next = cleanResults(next);
    next = cleanCertificates(next);
    next = withAudit(next, 'Data Health ran all safe fixes');
  }

  saveJson(APP_KEY, next);
  window.setTimeout(() => window.location.reload(), 150);
}

function downloadBackup() {
  const backup = {
    app: 'Stage Flow',
    type: 'data-health-backup',
    createdAt: new Date().toISOString(),
    localStorage: Object.fromEntries(BACKUP_KEYS.map(key => [key, window.localStorage.getItem(key)]).filter(([, value]) => value !== null))
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `stage-flow-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function issueIcon(severity) {
  if (severity === 'danger') return '⛔';
  if (severity === 'warn') return '⚠️';
  return 'ℹ️';
}

function severityLabel(severity) {
  if (severity === 'danger') return 'Needs fixing';
  if (severity === 'warn') return 'Check soon';
  return 'Worth knowing';
}

function buildIssueRows(issues) {
  if (!issues.length) {
    return '<div class="data-health-issue good"><strong>✅ No saved-data problems found</strong><small>The obvious saved-data checks are passing on this device.</small></div>';
  }
  return issues.map(issue => `
    <div class="data-health-issue ${escapeHtml(issue.severity)}">
      <div class="data-health-issue-head"><strong>${issueIcon(issue.severity)} ${escapeHtml(issue.title)}</strong><span>${severityLabel(issue.severity)}</span></div>
      <small>${escapeHtml(issue.detail)}</small>
      ${issue.fix ? `<button class="data-health-mini" data-data-health-fix="${escapeHtml(issue.fix)}">Fix this</button>` : ''}
    </div>
  `).join('');
}

function buildPanel() {
  const report = analyseHealth();
  const { stats } = report;
  const statusClass = stats.dangerCount ? 'danger' : stats.warnCount ? 'warn' : 'good';
  const statusText = stats.dangerCount ? 'Needs attention' : stats.warnCount ? 'Mostly healthy' : 'Healthy';
  return `
    <section class="card data-health-panel" data-data-health-panel>
      <div class="data-health-title">
        <div>
          <p class="muted">Saved-data safety</p>
          <h2>Data Health Check</h2>
          <p class="muted">Scans this device for old labels, broken lesson links, missing criteria groups, stale results and certificate issues.</p>
        </div>
        <div class="data-health-score ${statusClass}">${report.score}%<small>${statusText}</small></div>
      </div>
      <div class="data-health-stats">
        <div><strong>${stats.lessons}</strong><small>Sessions</small></div>
        <div><strong>${stats.learners}</strong><small>Names</small></div>
        <div><strong>${stats.groups}</strong><small>Criteria groups</small></div>
        <div><strong>${stats.certificates}</strong><small>Certificate requests</small></div>
        <div><strong>${stats.fixableCount}</strong><small>Fixable checks</small></div>
      </div>
      <div class="data-health-actions">
        <button class="btn org" data-data-health-download>Download backup</button>
        <button class="btn" data-data-health-fix="safe-fixes">Run safe fixes</button>
        <button class="btn" data-data-health-refresh>Re-scan</button>
      </div>
      <section class="card data-health-cardlet">
        <h3>Scan results</h3>
        ${buildIssueRows(report.issues)}
      </section>
      <section class="card data-health-cardlet">
        <h3>What this protects</h3>
        <div class="data-health-note">Old Evening Swim labels → newer Evening Swim Group / 1:1 wording</div>
        <div class="data-health-note">PE and Gymnastics sessions accidentally using swimming criteria</div>
        <div class="data-health-note">Names left behind after a class/session is deleted</div>
        <div class="data-health-note">Certificate tasks linked to missing learners</div>
      </section>
    </section>
  `;
}

function addStyles() {
  if (document.getElementById('stageflow-data-health-style')) return;
  const style = document.createElement('style');
  style.id = 'stageflow-data-health-style';
  style.textContent = `
    .data-health-panel{border-top:5px solid #0ea5e9}
    .data-health-title{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap}
    .data-health-title h2{margin:0}
    .data-health-score{min-width:110px;border:1px solid #d9dee8;border-radius:12px;padding:12px;text-align:center;font-size:28px;font-weight:1000;background:#f8fafc}
    .data-health-score small{display:block;font-size:12px;color:#64748b;margin-top:2px}
    .data-health-score.good{border-color:#16a34a;background:#f0fdf4;color:#14532d}
    .data-health-score.warn{border-color:#f97316;background:#fff7ed;color:#7c2d12}
    .data-health-score.danger{border-color:#dc2626;background:#fef2f2;color:#7f1d1d}
    .data-health-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:12px 0}
    .data-health-stats div{border:1px solid #d9dee8;background:#f8fafc;border-radius:8px;padding:10px;font-weight:1000}
    .data-health-stats strong{display:block;font-size:22px}
    .data-health-stats small{display:block;color:#64748b;margin-top:2px}
    .data-health-actions{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
    .data-health-cardlet{margin-top:10px;background:#fff}
    .data-health-issue{border:1px solid #d9dee8;border-left:5px solid #94a3b8;background:#fff;border-radius:8px;padding:10px;margin-top:8px}
    .data-health-issue.good{border-left-color:#16a34a;background:#f0fdf4;color:#14532d}
    .data-health-issue.warn{border-left-color:#f97316;background:#fff7ed}
    .data-health-issue.danger{border-left-color:#dc2626;background:#fef2f2}
    .data-health-issue.info{border-left-color:#2563eb;background:#eff6ff}
    .data-health-issue-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
    .data-health-issue-head span{border-radius:999px;background:#0f172a;color:#fff;padding:3px 8px;font-size:11px;font-weight:1000}
    .data-health-issue small{display:block;color:#475569;margin-top:4px;font-weight:800}
    .data-health-mini{margin-top:8px;border:1px solid #0f172a;background:#0f172a;color:white;border-radius:6px;padding:7px 10px;font-weight:1000}
    .data-health-note{border:1px solid #d9dee8;border-left:4px solid #0ea5e9;border-radius:8px;background:#f8fafc;padding:9px;margin-top:7px;font-weight:900}
  `;
  document.head.appendChild(style);
}

function mountPanel() {
  addStyles();
  const hero = Array.from(document.querySelectorAll('.hero h1')).find(item => item.textContent.trim() === 'Stability health check');
  const main = document.querySelector('main');
  if (!hero || !main) return;
  const old = main.querySelector('[data-data-health-panel]');
  if (old) old.remove();
  const anchor = Array.from(main.querySelectorAll('.card')).find(card => card.textContent.includes('Needs checks') || card.textContent.includes('Ready for manual sign-off'));
  if (anchor) anchor.insertAdjacentHTML('afterend', buildPanel());
  else main.insertAdjacentHTML('beforeend', buildPanel());
  const panel = main.querySelector('[data-data-health-panel]');
  panel?.addEventListener('click', event => {
    const download = event.target.closest('[data-data-health-download]');
    if (download) {
      downloadBackup();
      return;
    }
    const refresh = event.target.closest('[data-data-health-refresh]');
    if (refresh) {
      mountPanel();
      return;
    }
    const fix = event.target.closest('[data-data-health-fix]');
    if (fix) runFix(fix.getAttribute('data-data-health-fix'));
  });
}

let scheduled = false;
function scheduleMount() {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(() => {
    scheduled = false;
    mountPanel();
  }, 120);
}

window.addEventListener('load', scheduleMount);
new MutationObserver(scheduleMount).observe(document.documentElement, { childList: true, subtree: true });