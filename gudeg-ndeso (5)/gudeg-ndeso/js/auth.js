// Admin authentication.
// Live mode: Supabase Auth (email + password) and the user must also be listed in the `admins` table.
//            The real protection is Row Level Security in Postgres (see supabase/schema.sql); this file only decides what to show.
// Demo mode: a fixed login from config.js so the dashboard can be tried without a backend.
import { isLive, getClient } from './data.js';
import { SCHEMA, DEMO_ADMIN } from './config.js';

const HINT = 'gudeg.admin.hint';      // cached "looks logged in" flag, only used to label the drawer link
const DEMO = 'gudeg.admin.demo';
const setHint = (email) => (email ? localStorage.setItem(HINT, email) : localStorage.removeItem(HINT));
export const adminHint = () => localStorage.getItem(HINT);

/** Resolves to { email } when an admin is signed in, otherwise null. */
export async function currentAdmin() {
  if (!isLive) {
    const s = JSON.parse(sessionStorage.getItem(DEMO) || 'null');
    setHint(s?.email || null);
    return s;
  }
  const db = await getClient();
  const { data: { session } } = await db.auth.getSession();
  if (!session) { setHint(null); return null; }
  const a = SCHEMA.admins;
  const { data, error } = await db.from(a.table).select(a.cols.userId).eq(a.cols.userId, session.user.id).maybeSingle();
  if (error || !data) { setHint(null); return null; }
  setHint(session.user.email);
  return { email: session.user.email };
}

export async function login(email, password) {
  if (!isLive) {
    if (email.trim().toLowerCase() !== DEMO_ADMIN.email || password !== DEMO_ADMIN.password) throw new Error('Email atau kata sandi salah.');
    sessionStorage.setItem(DEMO, JSON.stringify({ email: DEMO_ADMIN.email }));
    setHint(DEMO_ADMIN.email);
    return { email: DEMO_ADMIN.email };
  }
  const db = await getClient();
  const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error('Email atau kata sandi salah.');
  const admin = await currentAdmin();
  if (!admin) { await db.auth.signOut(); throw new Error('Akun ini tidak memiliki akses admin.'); }
  return admin;
}

export async function logout() {
  setHint(null);
  if (!isLive) { sessionStorage.removeItem(DEMO); return; }
  const db = await getClient();
  await db.auth.signOut();
}
