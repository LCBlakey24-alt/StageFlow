import { supabase, supabaseConfigured } from './supabaseClient.js';

const CORE_KEYS = ['lessons', 'learners', 'sessionRecords', 'framework', 'certificates', 'pack', 'audit'];

function same(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function byId(items = []) {
  return new Map((items || []).map(item => [String(item.id), item]));
}

function parseAccountStaffId(value) {
  const raw = String(value || '');
  return raw.startsWith('account:') ? raw.slice('account:'.length) : raw || null;
}

function metres(value) {
  const parsed = parseInt(String(value || '0').replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function metreLabel(value) {
  return `${Number(value) || 0}m`;
}

function stateSessionToRow(organisationId, session, userId) {
  return {
    id: session.id,
    organisation_id: organisationId,
    title: session.name || 'Untitled session',
    programme: session.programme || 'Custom',
    day_name: session.day || 'Monday',
    start_time: session.time || '09:00',
    duration_minutes: Number(session.duration) || 30,
    venue: session.school || '',
    year_group: session.year || '',
    class_name: session.className || '',
    criteria_group_id: session.groupTemplateId || null,
    assessment_mode: session.mode || 'Stages only',
    features: session.features || { assessment: true, notes: true, evidence: false },
    coach_staff_id: parseAccountStaffId(session.coachId),
    updated_by: userId,
    updated_at: new Date().toISOString()
  };
}

function rowToSession(row) {
  return {
    id: row.id,
    day: row.day_name,
    time: String(row.start_time || '09:00').slice(0, 5),
    duration: Number(row.duration_minutes) || 30,
    school: row.venue || '',
    year: row.year_group || '',
    className: row.class_name || '',
    coachId: row.coach_staff_id ? `account:${row.coach_staff_id}` : '',
    coach: '',
    name: row.title || 'Untitled session',
    programme: row.programme || 'Custom',
    groupTemplateId: row.criteria_group_id || '',
    mode: row.assessment_mode || 'Stages only',
    features: row.features && typeof row.features === 'object'
      ? row.features
      : { assessment: true, notes: true, evidence: false }
  };
}

function stateLearnerToRow(organisationId, learner, userId) {
  return {
    id: learner.id,
    organisation_id: organisationId,
    session_template_id: learner.lesson,
    display_name: learner.name || 'Learner',
    stage: learner.stage || '',
    updated_by: userId,
    updated_at: new Date().toISOString()
  };
}

function emptyCloudState(base) {
  return {
    ...base,
    lessons: [],
    learners: [],
    sessionRecords: {},
    audit: [],
    pack: {
      ...(base.pack || {}),
      email: '',
      cc: ''
    }
  };
}

export function structuredSnapshot(state) {
  return CORE_KEYS.reduce((snapshot, key) => {
    snapshot[key] = state?.[key];
    return snapshot;
  }, {});
}

export async function loadStructuredOrganisation(organisationId, fallbackState) {
  if (!supabaseConfigured || !supabase || !organisationId) {
    return emptyCloudState(fallbackState);
  }

  const base = emptyCloudState(fallbackState);

  const [
    settingsResult,
    sessionsResult,
    learnersResult,
    learnerNotesResult,
    occurrencesResult,
    attendanceResult,
    assessmentsResult,
    progressResult,
    measurementsResult,
    sessionNotesResult
  ] = await Promise.all([
    supabase.from('organisation_settings').select('framework, certificates, pack, audit').eq('organisation_id', organisationId).maybeSingle(),
    supabase.from('session_templates').select('*').eq('organisation_id', organisationId).order('day_name').order('start_time'),
    supabase.from('learners').select('*').eq('organisation_id', organisationId).order('display_name'),
    supabase.from('learner_notes').select('*').eq('organisation_id', organisationId).order('created_at'),
    supabase.from('session_occurrences').select('*').eq('organisation_id', organisationId).order('occurrence_date'),
    supabase.from('attendance_records').select('*').eq('organisation_id', organisationId),
    supabase.from('assessment_results').select('*').eq('organisation_id', organisationId),
    supabase.from('learner_progress').select('*').eq('organisation_id', organisationId),
    supabase.from('learner_measurements').select('*').eq('organisation_id', organisationId),
    supabase.from('session_notes').select('*').eq('organisation_id', organisationId)
  ]);

  const results = [
    settingsResult, sessionsResult, learnersResult, learnerNotesResult, occurrencesResult,
    attendanceResult, assessmentsResult, progressResult, measurementsResult, sessionNotesResult
  ];
  const firstError = results.find(result => result.error)?.error;
  if (firstError) throw firstError;

  let settings = settingsResult.data || null;
  if (!settings) {
    const initialSettings = {
      organisation_id: organisationId,
      framework: base.framework || {},
      certificates: base.certificates || [],
      pack: base.pack || {},
      audit: []
    };
    const { data, error } = await supabase
      .from('organisation_settings')
      .insert(initialSettings)
      .select('framework, certificates, pack, audit')
      .maybeSingle();

    // Coaches may be first to open a brand-new organisation but are not
    // permitted to create settings. In that unusual case, use safe defaults
    // until an Admin signs in and creates the settings row.
    if (!error) settings = data;
    else if (error.code !== '42501') throw error;
  }

  const sessions = (sessionsResult.data || []).map(rowToSession);
  const notesByLearner = new Map();
  for (const note of learnerNotesResult.data || []) {
    const list = notesByLearner.get(note.learner_id) || [];
    list.push({
      id: note.id,
      source: note.source || 'Admin',
      author: note.author_name || 'Stage Flow',
      createdAt: note.created_at,
      text: note.note_text || ''
    });
    notesByLearner.set(note.learner_id, list);
  }

  const progressByLearner = new Map();
  for (const item of progressResult.data || []) {
    const current = progressByLearner.get(item.learner_id) || { res: {}, nc: {} };
    if (item.category === 'national_curriculum') current.nc[item.criterion] = item.result === 'pass';
    else current.res[item.criterion] = item.result;
    progressByLearner.set(item.learner_id, current);
  }

  const occurrenceById = new Map((occurrencesResult.data || []).map(row => [row.id, row]));
  const latestMeasurement = new Map();
  for (const measurement of measurementsResult.data || []) {
    const occurrence = occurrenceById.get(measurement.occurrence_id);
    if (!occurrence) continue;
    const current = latestMeasurement.get(measurement.learner_id);
    if (!current || String(occurrence.occurrence_date) >= String(current.date)) {
      latestMeasurement.set(measurement.learner_id, {
        date: occurrence.occurrence_date,
        front: metreLabel(measurement.front_metres),
        back: metreLabel(measurement.back_metres)
      });
    }
  }

  const learners = (learnersResult.data || []).map(row => {
    const progress = progressByLearner.get(row.id) || { res: {}, nc: {} };
    const latest = latestMeasurement.get(row.id);
    return {
      id: row.id,
      lesson: row.session_template_id,
      name: row.display_name || 'Learner',
      stage: row.stage || '',
      att: 'Present',
      res: progress.res,
      dist: latest ? { front: latest.front, back: latest.back } : { front: '0m', back: '0m' },
      nc: progress.nc,
      sessionNote: '',
      notes: notesByLearner.get(row.id) || []
    };
  });

  const records = {};
  for (const occurrence of occurrencesResult.data || []) {
    const key = `${occurrence.session_template_id}::${occurrence.occurrence_date}`;
    records[key] = {
      occurrenceId: occurrence.id,
      lessonId: occurrence.session_template_id,
      date: occurrence.occurrence_date,
      startedAt: occurrence.started_at || '',
      completedAt: occurrence.completed_at || '',
      learners: {}
    };
  }

  function ensureSnapshot(occurrenceId, learnerId) {
    const occurrence = occurrenceById.get(occurrenceId);
    if (!occurrence) return null;
    const key = `${occurrence.session_template_id}::${occurrence.occurrence_date}`;
    const record = records[key];
    if (!record) return null;
    record.learners[learnerId] = record.learners[learnerId] || {};
    return record.learners[learnerId];
  }

  for (const attendance of attendanceResult.data || []) {
    const snapshot = ensureSnapshot(attendance.occurrence_id, attendance.learner_id);
    if (snapshot) snapshot.att = attendance.status || 'Present';
  }

  for (const result of assessmentsResult.data || []) {
    const snapshot = ensureSnapshot(result.occurrence_id, result.learner_id);
    if (!snapshot) continue;
    if (result.category === 'national_curriculum') {
      snapshot.nc = snapshot.nc || {};
      snapshot.nc[result.criterion] = result.result === 'pass';
    } else {
      snapshot.res = snapshot.res || {};
      snapshot.res[result.criterion] = result.result;
    }
  }

  for (const measurement of measurementsResult.data || []) {
    const snapshot = ensureSnapshot(measurement.occurrence_id, measurement.learner_id);
    if (snapshot) {
      snapshot.dist = {
        front: metreLabel(measurement.front_metres),
        back: metreLabel(measurement.back_metres)
      };
    }
  }

  for (const note of sessionNotesResult.data || []) {
    const snapshot = ensureSnapshot(note.occurrence_id, note.learner_id);
    if (snapshot) snapshot.sessionNote = note.note_text || '';
  }

  return {
    ...base,
    lessons: sessions,
    learners,
    sessionRecords: records,
    framework: settings?.framework && Object.keys(settings.framework).length ? settings.framework : base.framework,
    certificates: Array.isArray(settings?.certificates) ? settings.certificates : base.certificates,
    pack: settings?.pack && typeof settings.pack === 'object' ? settings.pack : base.pack,
    audit: Array.isArray(settings?.audit) ? settings.audit : []
  };
}

async function currentAuthUserId() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user?.id || null;
}

async function saveSettings(organisationId, previous, next, userId) {
  if (
    same(previous.framework, next.framework) &&
    same(previous.certificates, next.certificates) &&
    same(previous.pack, next.pack) &&
    same(previous.audit, next.audit)
  ) return;

  const { error } = await supabase.from('organisation_settings').upsert({
    organisation_id: organisationId,
    framework: next.framework || {},
    certificates: next.certificates || [],
    pack: next.pack || {},
    audit: next.audit || [],
    updated_by: userId,
    updated_at: new Date().toISOString()
  }, { onConflict: 'organisation_id' });

  if (error) throw error;
}

async function saveSessions(organisationId, previous, next, userId) {
  const oldMap = byId(previous.lessons);
  const newMap = byId(next.lessons);

  const changed = (next.lessons || [])
    .filter(item => !same(oldMap.get(String(item.id)), item))
    .map(item => stateSessionToRow(organisationId, item, userId));

  if (changed.length) {
    const { error } = await supabase.from('session_templates').upsert(changed, { onConflict: 'id' });
    if (error) throw error;
  }

  const removed = (previous.lessons || []).filter(item => !newMap.has(String(item.id))).map(item => item.id);
  if (removed.length) {
    const { error } = await supabase.from('session_templates').delete().in('id', removed);
    if (error) throw error;
  }
}

async function saveLearners(organisationId, previous, next, userId) {
  const oldMap = byId(previous.learners);
  const newMap = byId(next.learners);

  const baseFields = learner => learner ? ({
    id: learner.id,
    lesson: learner.lesson,
    name: learner.name,
    stage: learner.stage
  }) : null;

  const changed = (next.learners || [])
    .filter(item => !same(baseFields(oldMap.get(String(item.id))), baseFields(item)))
    .map(item => stateLearnerToRow(organisationId, item, userId));

  if (changed.length) {
    const { error } = await supabase.from('learners').upsert(changed, { onConflict: 'id' });
    if (error) throw error;
  }

  const removed = (previous.learners || []).filter(item => !newMap.has(String(item.id))).map(item => item.id);
  if (removed.length) {
    const { error } = await supabase.from('learners').delete().in('id', removed);
    if (error) throw error;
  }

  const oldNotes = new Map();
  for (const learner of previous.learners || []) {
    for (const note of Array.isArray(learner.notes) ? learner.notes : []) oldNotes.set(String(note.id), { ...note, learnerId: learner.id });
  }
  const newNotes = new Map();
  for (const learner of next.learners || []) {
    for (const note of Array.isArray(learner.notes) ? learner.notes : []) newNotes.set(String(note.id), { ...note, learnerId: learner.id });
  }

  const noteRows = [...newNotes.values()]
    .filter(note => !same(oldNotes.get(String(note.id)), note))
    .map(note => ({
      id: note.id,
      organisation_id: organisationId,
      learner_id: note.learnerId,
      source: note.source || 'Admin',
      note_text: note.text || '',
      author_name: note.author || 'Stage Flow',
      created_by: userId,
      created_at: note.createdAt || new Date().toISOString()
    }));

  if (noteRows.length) {
    const { error } = await supabase.from('learner_notes').upsert(noteRows, { onConflict: 'id' });
    if (error) throw error;
  }

  const removedNotes = [...oldNotes.keys()].filter(id => !newNotes.has(id));
  if (removedNotes.length) {
    const { error } = await supabase.from('learner_notes').delete().in('id', removedNotes);
    if (error) throw error;
  }
}

async function ensureOccurrence(organisationId, record, userId) {
  const payload = {
    organisation_id: organisationId,
    session_template_id: record.lessonId,
    occurrence_date: record.date,
    started_at: record.startedAt || null,
    completed_at: record.completedAt || null,
    updated_at: new Date().toISOString()
  };

  if (record.startedAt) payload.started_by = userId;
  if (record.completedAt) payload.completed_by = userId;

  const { data, error } = await supabase
    .from('session_occurrences')
    .upsert(payload, { onConflict: 'session_template_id,occurrence_date' })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

async function saveOccurrenceLearners(organisationId, occurrenceId, record, userId) {
  const attendanceRows = [];
  const measurementRows = [];
  const noteRows = [];
  const assessmentRows = [];
  const progressRows = [];

  for (const [learnerId, snapshot] of Object.entries(record.learners || {})) {
    attendanceRows.push({
      organisation_id: organisationId,
      occurrence_id: occurrenceId,
      learner_id: learnerId,
      status: snapshot.att || 'Present',
      updated_by: userId,
      updated_at: new Date().toISOString()
    });

    if (snapshot.dist) {
      measurementRows.push({
        organisation_id: organisationId,
        occurrence_id: occurrenceId,
        learner_id: learnerId,
        front_metres: metres(snapshot.dist.front),
        back_metres: metres(snapshot.dist.back),
        updated_by: userId,
        updated_at: new Date().toISOString()
      });
    }

    if (Object.prototype.hasOwnProperty.call(snapshot, 'sessionNote')) {
      noteRows.push({
        organisation_id: organisationId,
        occurrence_id: occurrenceId,
        learner_id: learnerId,
        note_text: snapshot.sessionNote || '',
        updated_by: userId,
        updated_at: new Date().toISOString()
      });
    }

    for (const [criterion, result] of Object.entries(snapshot.res || {})) {
      const row = {
        organisation_id: organisationId,
        occurrence_id: occurrenceId,
        learner_id: learnerId,
        category: 'criteria',
        criterion,
        result: String(result || ''),
        updated_by: userId,
        updated_at: new Date().toISOString()
      };
      assessmentRows.push(row);
      progressRows.push({
        organisation_id: organisationId,
        learner_id: learnerId,
        category: 'criteria',
        criterion,
        result: String(result || ''),
        updated_by: userId,
        updated_at: new Date().toISOString()
      });
    }

    for (const [criterion, achieved] of Object.entries(snapshot.nc || {})) {
      const result = achieved ? 'pass' : 'no';
      assessmentRows.push({
        organisation_id: organisationId,
        occurrence_id: occurrenceId,
        learner_id: learnerId,
        category: 'national_curriculum',
        criterion,
        result,
        updated_by: userId,
        updated_at: new Date().toISOString()
      });
      progressRows.push({
        organisation_id: organisationId,
        learner_id: learnerId,
        category: 'national_curriculum',
        criterion,
        result,
        updated_by: userId,
        updated_at: new Date().toISOString()
      });
    }
  }

  const batches = [
    ['attendance_records', attendanceRows, 'occurrence_id,learner_id'],
    ['learner_measurements', measurementRows, 'occurrence_id,learner_id'],
    ['session_notes', noteRows, 'occurrence_id,learner_id'],
    ['assessment_results', assessmentRows, 'occurrence_id,learner_id,category,criterion'],
    ['learner_progress', progressRows, 'learner_id,category,criterion']
  ];

  for (const [table, rows, onConflict] of batches) {
    if (!rows.length) continue;
    const { error } = await supabase.from(table).upsert(rows, { onConflict });
    if (error) throw error;
  }
}

async function saveOccurrences(organisationId, previous, next, userId) {
  const oldRecords = previous.sessionRecords || {};
  const newRecords = next.sessionRecords || {};

  for (const [key, record] of Object.entries(newRecords)) {
    if (same(oldRecords[key], record)) continue;
    const occurrenceId = await ensureOccurrence(organisationId, record, userId);
    await saveOccurrenceLearners(organisationId, occurrenceId, record, userId);
  }
}

export async function saveStructuredOrganisation(organisationId, previousState, nextState) {
  if (!supabaseConfigured || !supabase || !organisationId) return;
  const previous = structuredSnapshot(previousState || {});
  const next = structuredSnapshot(nextState || {});
  const userId = await currentAuthUserId();

  // Admin-only changes are attempted only when they actually changed, so a
  // coach saving attendance does not trip an unrelated settings/session RLS rule.
  await saveSettings(organisationId, previous, next, userId);
  await saveSessions(organisationId, previous, next, userId);
  await saveLearners(organisationId, previous, next, userId);
  await saveOccurrences(organisationId, previous, next, userId);
}
