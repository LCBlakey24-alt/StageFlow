import React, { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from './supabaseClient.js';

function normaliseStaff(row) {
  if (!row) return null;
  const role = ['owner', 'admin'].includes(String(row.role || '').toLowerCase()) ? 'Admin' : 'Coach';
  const permissionDefaults = role === 'Admin'
    ? { sessions: true, groups: true, learners: true, assess: true, export: true, framework: true, certificates: true }
    : { sessions: true, groups: false, learners: true, assess: true, export: false, framework: false, certificates: false };
  const permissions = row.permissions && typeof row.permissions === 'object' ? row.permissions : {};

  return {
    id: `account:${row.id}`,
    accountStaffId: row.id,
    organisationId: row.organisation_id,
    authUserId: row.auth_user_id,
    name: row.display_name || 'Stage Flow user',
    email: row.email || '',
    role,
    accountRole: row.role,
    ...permissionDefaults,
    ...permissions
  };
}

function storeLinkedStaff(staff) {
  try {
    if (staff) window.sessionStorage.setItem('stageflow-account-staff', JSON.stringify(staff));
    else window.sessionStorage.removeItem('stageflow-account-staff');
  } catch {}
}

async function loadLinkedStaff(userId) {
  const { data, error } = await supabase
    .from('staff_members')
    .select('id, organisation_id, auth_user_id, display_name, email, role, permissions, is_active')
    .eq('auth_user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return normaliseStaff(data);
}

export function StageFlowAccountGate({ children }) {
  const [status, setStatus] = useState(supabaseConfigured ? 'loading' : 'demo');
  const [session, setSession] = useState(null);
  const [staff, setStaff] = useState(null);
  const [mode, setMode] = useState('signin');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabaseConfigured) {
      storeLinkedStaff(null);
      setStatus('demo');
      return undefined;
    }

    let live = true;

    async function applySession(nextSession) {
      if (!live) return;
      setSession(nextSession || null);
      if (!nextSession?.user?.id) {
        storeLinkedStaff(null);
        setStaff(null);
        setStatus('signed-out');
        return;
      }

      try {
        const linkedStaff = await loadLinkedStaff(nextSession.user.id);
        if (!live) return;
        setStaff(linkedStaff);
        storeLinkedStaff(linkedStaff);
        setStatus(linkedStaff ? 'ready' : 'unlinked');
      } catch (loadError) {
        console.error('Stage Flow account link failed', loadError);
        if (!live) return;
        setError('Your account signed in, but Stage Flow could not load its staff profile.');
        setStatus('unlinked');
      }
    }

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) {
        console.error('Stage Flow auth session failed', sessionError);
        if (live) setStatus('signed-out');
        return;
      }
      applySession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setMode('recovery');
      window.setTimeout(() => applySession(nextSession), 0);
    });

    return () => {
      live = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  async function signOut() {
    setError('');
    await supabase.auth.signOut();
    storeLinkedStaff(null);
    setStaff(null);
    setSession(null);
    setStatus('signed-out');
  }

  if (!supabaseConfigured || status === 'demo') {
    return children({ accountMode: false, signOut: null });
  }

  if (status === 'loading') return <div className='account-loading'>Loading Stage Flow…</div>;

  if (status === 'ready' && session && staff) {
    return children({ accountMode: true, signOut, staff });
  }

  if (status === 'unlinked' && session) {
    return <div className='account-gate'>
      <section className='card account-unlinked'>
        <h1>Account not linked</h1>
        <p className='muted'>You are signed in, but this account is not linked to an active Stage Flow staff record yet.</p>
        <p className='account-email'>{session.user.email}</p>
        {error && <p className='account-error'>{error}</p>}
        <button className='btn org' onClick={signOut}>Sign out</button>
      </section>
    </div>;
  }

  return <AccountForm
    mode={mode}
    setMode={setMode}
    message={message}
    setMessage={setMessage}
    error={error}
    setError={setError}
  />;
}

function AccountForm({ mode, setMode, message, setMessage, error, setError }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organisationName, setOrganisationName] = useState('');
  const [busy, setBusy] = useState(false);

  function switchMode(next) {
    setMode(next);
    setMessage('');
    setError('');
    setPassword('');
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'signin') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
      } else if (mode === 'signup') {
        if (!fullName.trim() || !organisationName.trim()) {
          throw new Error('Add your name and organisation name.');
        }
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/?auth=confirmed`,
            data: {
              full_name: fullName.trim(),
              organisation_name: organisationName.trim()
            }
          }
        });
        if (authError) throw authError;
        if (!data.session) setMessage('Check your email to confirm your Stage Flow account.');
      } else if (mode === 'forgot') {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/?auth=recovery`
        });
        if (authError) throw authError;
        setMessage('If an account can receive a reset email, instructions have been sent.');
      } else if (mode === 'recovery') {
        if (password.length < 8) throw new Error('Use at least 8 characters for your new password.');
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
        setMessage('Password updated. You can continue into Stage Flow.');
      }
    } catch (authError) {
      setError(authError?.message || 'Stage Flow could not complete that account request.');
    } finally {
      setBusy(false);
    }
  }

  const creating = mode === 'signup';
  const recovery = mode === 'recovery';

  return <div className='account-gate'>
    <div className='account-shell'>
      <div className='account-brand'>Stage Flow</div>
      <section className='card account-card'>
        {!recovery && mode !== 'forgot' && <div className='account-tabs'>
          <button className={mode === 'signin' ? 'on' : ''} onClick={() => switchMode('signin')}>Sign in</button>
          <button className={mode === 'signup' ? 'on' : ''} onClick={() => switchMode('signup')}>Create admin account</button>
        </div>}

        <form className='account-form' onSubmit={submit}>
          <div>
            <h2>{mode === 'signin' ? 'Staff sign in' : creating ? 'Create your Stage Flow organisation' : mode === 'forgot' ? 'Reset password' : 'Choose a new password'}</h2>
            <p className='muted'>{creating ? 'The first account becomes the organisation owner. Staff accounts are invited separately.' : mode === 'signin' ? 'Use the email linked to your Stage Flow staff account.' : mode === 'forgot' ? 'Enter your account email and we will send reset instructions.' : 'Enter the new password for your Stage Flow account.'}</p>
          </div>

          {creating && <>
            <div className='field'><label>Your name</label><input autoComplete='name' value={fullName} onChange={e => setFullName(e.target.value)} /></div>
            <div className='field'><label>Organisation name</label><input value={organisationName} onChange={e => setOrganisationName(e.target.value)} placeholder='School, swim school or club' /></div>
          </>}

          {!recovery && <div className='field'><label>Email</label><input type='email' autoComplete='email' required value={email} onChange={e => setEmail(e.target.value)} /></div>}
          {mode !== 'forgot' && <div className='field'><label>{recovery ? 'New password' : 'Password'}</label><input type='password' autoComplete={creating ? 'new-password' : recovery ? 'new-password' : 'current-password'} required minLength={8} value={password} onChange={e => setPassword(e.target.value)} /></div>}

          {message && <p className='account-message'>{message}</p>}
          {error && <p className='account-error'>{error}</p>}

          <button className='btn org' disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : creating ? 'Create account' : mode === 'forgot' ? 'Send reset email' : 'Save new password'}</button>

          {mode === 'signin' && <button type='button' className='account-link' onClick={() => switchMode('forgot')}>Forgot password?</button>}
          {(mode === 'forgot' || mode === 'recovery') && <button type='button' className='account-link' onClick={() => switchMode('signin')}>Back to sign in</button>}
        </form>
      </section>
    </div>
  </div>;
}


export function StaffAccountsPanel() {
  const [staff, setStaff] = useState([]);
  const [invites, setInvites] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('coach');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function refresh() {
    if (!supabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    const [staffResult, inviteResult] = await Promise.all([
      supabase
        .from('staff_members')
        .select('id, display_name, email, role, is_active, created_at, auth_user_id')
        .order('display_name'),
      supabase
        .from('staff_invitations')
        .select('id, email, display_name, role, expires_at, accepted_at, created_at')
        .order('created_at', { ascending: false })
    ]);

    if (staffResult.error) setError(staffResult.error.message);
    if (inviteResult.error && !staffResult.error) setError(inviteResult.error.message);

    setStaff(staffResult.data || []);
    setInvites(inviteResult.data || []);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function invite(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();
      if (!cleanName || !cleanEmail) throw new Error('Add a staff name and email address.');

      const permissions = role === 'admin'
        ? { sessions: true, groups: true, learners: true, assess: true, export: true, framework: true, certificates: true }
        : { sessions: true, groups: false, learners: true, assess: true, export: false, framework: false, certificates: false };

      const { data, error: inviteError } = await supabase.functions.invoke('invite-staff', {
        body: {
          displayName: cleanName,
          email: cleanEmail,
          role,
          permissions,
          redirectTo: `${window.location.origin}/?auth=invite`
        }
      });

      if (inviteError) throw inviteError;
      if (data?.error) throw new Error(data.error);

      setName('');
      setEmail('');
      setRole('coach');
      setMessage(`Invitation sent to ${cleanEmail}.`);
      await refresh();
    } catch (inviteError) {
      setError(inviteError?.message || 'Could not send that staff invitation.');
    } finally {
      setBusy(false);
    }
  }

  if (!supabaseConfigured) return null;

  return <section className='card staff-accounts-card'>
    <div className='admin-framework-head'>
      <div>
        <h2>Staff accounts</h2>
        <p className='muted'>Invite staff by email and link their login to this organisation.</p>
      </div>
      <button className='btn' onClick={refresh} disabled={loading}>Refresh</button>
    </div>

    <form className='staff-invite-form' onSubmit={invite}>
      <div className='grid2'>
        <div className='field'><label>Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder='Coach name' /></div>
        <div className='field'><label>Email</label><input type='email' value={email} onChange={e => setEmail(e.target.value)} placeholder='coach@example.com' /></div>
      </div>
      <div className='field'>
        <label>Role</label>
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value='coach'>Coach</option>
          <option value='admin'>Admin</option>
        </select>
      </div>
      {message && <p className='account-message'>{message}</p>}
      {error && <p className='account-error'>{error}</p>}
      <button className='btn org' disabled={busy}>{busy ? 'Sending invitation…' : 'Invite staff member'}</button>
    </form>

    <div className='staff-account-list'>
      <div className='staff-account-list-head'><h3>Linked staff</h3><span className='pill'>{staff.length}</span></div>
      {loading ? <p className='muted'>Loading accounts…</p> : staff.length ? staff.map(person => <article className='staff-account-row' key={person.id}>
        <div><strong>{person.display_name}</strong><small>{person.email}</small></div>
        <span className='pill'>{person.role}</span>
      </article>) : <p className='muted'>No linked staff accounts yet.</p>}
    </div>

    {invites.length > 0 && <div className='staff-account-list'>
      <div className='staff-account-list-head'><h3>Invitations</h3><span className='pill'>{invites.length}</span></div>
      {invites.slice(0, 10).map(invite => <article className='staff-account-row' key={invite.id}>
        <div><strong>{invite.display_name || invite.email}</strong><small>{invite.email}</small></div>
        <span className='pill'>{invite.accepted_at ? 'Account created' : 'Invited'}</span>
      </article>)}
    </div>}
  </section>;
}
