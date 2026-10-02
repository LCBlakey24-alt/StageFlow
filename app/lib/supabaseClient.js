import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://cxicwcsjgkphmltxwyim.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_JPPpMLnZfWdriAv6MjtlxA_ydqnc4qP';

const url = String(import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
const publishableKey = String(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_PUBLISHABLE_KEY
).trim();

export const supabaseConfigured = Boolean(url && publishableKey);

const sessionStorageAdapter = typeof window !== 'undefined' ? {
  getItem(key) {
    try { return window.sessionStorage.getItem(key); } catch { return null; }
  },
  setItem(key, value) {
    try { window.sessionStorage.setItem(key, value); } catch {}
  },
  removeItem(key) {
    try { window.sessionStorage.removeItem(key); } catch {}
  }
} : undefined;

export const supabase = supabaseConfigured
  ? createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        storage: sessionStorageAdapter,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;
