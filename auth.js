// ===== SUPABASE CONFIG (PUBLIC) =====
const SUPABASE_URL = "PASTE_YOUR_PROJECT_URL";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SB_PUBLISHABLE_KEY";

// IMPORTANT: Supabase CDN exposes global "supabase" (not window.supabase)
const supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getSession() {
  const { data, error } = await supa.auth.getSession();
  if (error) throw error;
  return data?.session || null;
}

async function requireLogin() {
  const session = await getSession();
  if (!session) {
    window.location.replace("login.html");
    throw new Error("Not logged in");
  }
  return session;
}

async function loginWithEmail(email, password) {
  const { error } = await supa.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

async function signupWithEmail(email, password) {
  const { error } = await supa.auth.signUp({ email, password });
  if (error) throw error;
}

async function logout() {
  await supa.auth.signOut();
  window.location.replace("login.html");
}

// Expose API
window.EXAMIA_AUTH = {
  requireLogin,
  loginWithEmail,
  signupWithEmail,
  logout,
  getSession,
};
