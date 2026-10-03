import { supabase, supabaseConfigured } from './supabaseClient.js';

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
