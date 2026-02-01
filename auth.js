// ======= SUPABASE CONFIG (safe public keys) =======
const SUPABASE_URL = "https://trmgroinlupwaaslhbpp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_b2qe0-XudOsCcM5nxZWW4g_P2OYZr0y";

// Supabase JS via CDN is loaded in HTML before this file
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --------- Helpers ----------
async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

async function requireLogin() {
  const session = await getSession();
  if (!session) {
    window.location.href = "login.html";
    return null;
  }
  return session;
}

async function logout() {
  await supabase.auth.signOut();
  window.location.href = "login.html";
}

// --------- Login ----------
async function loginWithEmail(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

// --------- Signup ----------
async function signupWithEmail(email, password) {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
}

// expose to window (so HTML can call)
window.EXAMIA_AUTH = {
  requireLogin,
  logout,
  loginWithEmail,
  signupWithEmail,
  getSession
};
