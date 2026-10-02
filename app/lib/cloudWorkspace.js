import { supabase, supabaseConfigured } from './supabaseClient.js';

const SHARED_KEYS = ['lessons', 'learners', 'sessionRecords', 'framework', 'certificates', 'pack', 'audit'];

export function workspaceSnapshot(state) {
  return SHARED_KEYS.reduce((snapshot, key) => {
    snapshot[key] = state?.[key];
    return snapshot;
  }, {});
}

export function mergeWorkspaceSnapshot(current, shared) {
  if (!shared || typeof shared !== 'object') return current;
  const merged = { ...current };
  SHARED_KEYS.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(shared, key)) merged[key] = shared[key];
  });
  return merged;
}

export async function loadOrganisationWorkspace(organisationId) {
  if (!supabaseConfigured || !supabase || !organisationId) return null;
  const { data, error } = await supabase
    .from('organisation_workspaces')
    .select('state, revision, updated_at')
    .eq('organisation_id', organisationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    state: data.state && typeof data.state === 'object' ? data.state : {},
    revision: Number(data.revision) || 1,
    updatedAt: data.updated_at || ''
  };
}

export async function createOrganisationWorkspace(organisationId, state) {
  const sessionResult = await supabase.auth.getSession();
  const userId = sessionResult.data.session?.user?.id || null;
  const payload = {
    organisation_id: organisationId,
    state: workspaceSnapshot(state),
    revision: 1,
    updated_by: userId,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('organisation_workspaces')
    .insert(payload)
    .select('state, revision, updated_at')
    .single();

  if (error) {
    // Another signed-in device may have created the workspace first.
    if (error.code === '23505') {
      const existing = await loadOrganisationWorkspace(organisationId);
      if (existing) return existing;
    }
    throw error;
  }

  return {
    state: data.state || payload.state,
    revision: Number(data.revision) || 1,
    updatedAt: data.updated_at || payload.updated_at
  };
}

export async function saveOrganisationWorkspace(organisationId, state, expectedRevision) {
  if (!supabaseConfigured || !supabase || !organisationId) {
    return { revision: expectedRevision, conflict: false };
  }

  const sessionResult = await supabase.auth.getSession();
  const userId = sessionResult.data.session?.user?.id || null;
  const nextRevision = Math.max(1, Number(expectedRevision) + 1);

  const { data, error } = await supabase
    .from('organisation_workspaces')
    .update({
      state: workspaceSnapshot(state),
      revision: nextRevision,
      updated_by: userId,
      updated_at: new Date().toISOString()
    })
    .eq('organisation_id', organisationId)
    .eq('revision', Number(expectedRevision) || 0)
    .select('revision')
    .maybeSingle();

  if (error) throw error;
  if (!data) return { revision: Number(expectedRevision) || 0, conflict: true };
  return { revision: Number(data.revision) || nextRevision, conflict: false };
}

export async function loadOrganisationStaff(organisationId) {
  if (!supabaseConfigured || !supabase || !organisationId) return [];

  const { data, error } = await supabase
    .from('staff_members')
    .select('id, organisation_id, auth_user_id, display_name, email, role, permissions, is_active')
    .eq('organisation_id', organisationId)
    .eq('is_active', true)
    .order('display_name');

  if (error) throw error;

  return (data || []).map(row => {
    const isAdmin = ['owner', 'admin'].includes(String(row.role || '').toLowerCase());
    const defaults = isAdmin
      ? { sessions: true, groups: true, learners: true, assess: true, export: true, framework: true, certificates: true }
      : { sessions: true, groups: false, learners: true, assess: true, export: false, framework: false, certificates: false };

    return {
      id: `account:${row.id}`,
      accountStaffId: row.id,
      organisationId: row.organisation_id,
      authUserId: row.auth_user_id,
      name: row.display_name || row.email || 'Stage Flow staff',
      email: row.email || '',
      role: isAdmin ? 'Admin' : 'Coach',
      accountRole: row.role,
      ...defaults,
      ...(row.permissions && typeof row.permissions === 'object' ? row.permissions : {})
    };
  });
}
