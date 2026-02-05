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
  const { data, error } = await supaClient.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const user = data?.user;

  if (user && !user.email_confirmed_at) {
    await supaClient.auth.signOut();
    throw new Error("Email not confirmed. Please verify from Gmail.");
  }

  return data;
}

async function signupWithEmail(email, password) {
  const redirectTo = `${window.location.origin}/auth-callback.html`;

  const { data, error } = await supaClient.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo }
  });

  if (error) throw error;

  // Important: usually signup returns no session until email is confirmed
  return data;
}
async function resendSignupEmail(email) {
  const redirectTo = `${window.location.origin}/auth-callback.html`;
  const { data, error } = await supaClient.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: redirectTo }
  });
  if (error) throw error;
  return data;
}
// ---- PHONE OTP (SMS) ----
async function sendPhoneOtp(phone) {
  const { error } = await supaClient.auth.signInWithOtp({ phone });
  if (error) throw error;
}

async function verifyPhoneOtp(phone, token) {
  const { error } = await supaClient.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });
  if (error) throw error;
}
// ---------- PROFILES ----------
async function getProfile() {
  const { data: { session } } = await supaClient.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  const { data, error } = await supaClient
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function saveProfile(payload) {
  const { data: { session } } = await supaClient.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error("Not logged in");

  const row = {
    user_id: user.id,
    name: payload.name,
    phone: payload.phone,
    class_level: payload.class_level,
    address: payload.address,
  };

  const { error } = await supaClient
    .from("profiles")
    .upsert(row, { onConflict: "user_id" });

  if (error) throw error;
}

// ---------- PHONE OTP ----------
async function sendPhoneOtp(phone) {
  const { error } = await supaClient.auth.signInWithOtp({ phone });
  if (error) throw error;
}

async function verifyPhoneOtp(phone, token) {
  const { error } = await supaClient.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });
  if (error) throw error;
}

// store verification using timestamp (no boolean)
async function markPhoneVerifiedAt() {
  const { data: { session } } = await supaClient.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error("Not logged in");

  const { error } = await supaClient
    .from("profiles")
    .update({ phone_verified_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) throw error;
}
async function logout() {
  await supaClient.auth.signOut();
  window.location.replace("login.html");
}

async function sendPhoneOtp(phone) {
  const { error } = await supaClient.auth.signInWithOtp({ phone });
  if (error) throw error;
}

async function verifyPhoneOtp(phone, token) {
  const { error } = await supaClient.auth.verifyOtp({
    phone,
    token,
    type: "sms"
  });
  if (error) throw error;
}

window.EXAMIA_AUTH = {
  requireLogin,
  loginWithEmail,
  signupWithEmail,
  resendSignupEmail,
  logout,
  getSession,
  //PROFILE
  getProfile,
  saveProfile,
  markPhoneVerifiedAt,
  //OTP
  sendPhoneOtp,
  verifyPhoneOtp,
};

window.EXAMIA_AUTH.setupMenu = function () {
  const hamBtn = document.getElementById("hamBtn");
  const hamMenu = document.getElementById("hamMenu");
  const logoutBtn = document.getElementById("logoutBtn");

  if (!hamBtn || !hamMenu) return;

  hamBtn.addEventListener("click", () => {
    hamMenu.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!hamMenu.contains(e.target) && !hamBtn.contains(e.target)) {
      hamMenu.classList.remove("open");
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    try {
      await window.EXAMIA_AUTH.logout();
    } finally {
      location.href = "login.html";
    }
  });
};
