// ===== SUPABASE CONFIG (PUBLIC) =====
const SUPABASE_URL = "https://trmgroinlupwaaslhbpp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_b2qe0-XudOsCcM5nxZWW4g_P2OYZr0y";

// Supabase CDN creates a global named: supabase
// So we must NOT create a variable named "supabase"
const supaClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getSession() {
  const { data, error } = await supaClient.auth.getSession();
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
  const { error } = await supaClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

async function signupWithEmail(email, password) {
  const { error } = await supaClient.auth.signUp({ email, password });
  if (error) throw error;
}

async function logout() {
  await supaClient.auth.signOut();
  window.location.replace("login.html");
}

window.EXAMIA_AUTH = {
  requireLogin,
  loginWithEmail,
  signupWithEmail,
  logout,
  getSession
};
