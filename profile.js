const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// require login
(async () => {
  try {
    await window.EXAMIA_AUTH.requireLogin();
  } catch (e) {
    window.location.href = "login.html";
  }
})();

// menu
const hamburger = document.getElementById("hamburger");
const hamMenu = document.getElementById("hamMenu");

hamburger.addEventListener("click", () => {
  hamMenu.classList.toggle("open");
});

document.addEventListener("click", (e) => {
  if (!hamMenu.contains(e.target) && !hamburger.contains(e.target)) {
    hamMenu.classList.remove("open");
  }
});

// logout
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await window.EXAMIA_AUTH.logout();
  window.location.href = "login.html";
});

// inputs
const nameEl = document.getElementById("p_name");
const phoneEl = document.getElementById("p_phone");
const classEl = document.getElementById("p_class");
const addressEl = document.getElementById("p_address");
const msgEl = document.getElementById("msg");

async function getUserId() {
  const user = await window.EXAMIA_AUTH.getUser();
  return user?.id || null;
}

async function loadProfile() {
  msgEl.textContent = "Loading profile...";

  const uid = await getUserId();
  if (!uid) return (window.location.href = "login.html");

  const { data, error } = await window.EXAMIA_AUTH.supabase
    .from("profiles")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();

  if (error) {
    msgEl.textContent = "❌ Failed to load profile";
    return;
  }

  if (!data) {
    msgEl.textContent = "New user ✅ Please fill your details and press Save.";
    nameEl.value = "";
    phoneEl.value = "";
    classEl.value = "";
    addressEl.value = "";
    return;
  }

  nameEl.value = data.name || "";
  phoneEl.value = data.phone || "";
  classEl.value = data.class_level || data.class || "";
  addressEl.value = data.address || "";

  msgEl.textContent = "Profile loaded ✅";
}

async function saveProfile() {
  msgEl.textContent = "Saving...";

  const uid = await getUserId();
  if (!uid) return (window.location.href = "login.html");

  const payload = {
    user_id: uid,
    name: (nameEl.value || "").trim(),
    phone: (phoneEl.value || "").trim(),
    class_level: classEl.value,
    address: (addressEl.value || "").trim(),
  };

  if (!payload.name) return (msgEl.textContent = "❌ Name is required");
  if (!payload.phone) return (msgEl.textContent = "❌ Phone is required");
  if (!payload.class_level) return (msgEl.textContent = "❌ Select class");
  if (!payload.address) return (msgEl.textContent = "❌ Address is required");

  const { error } = await window.EXAMIA_AUTH.supabase
    .from("profiles")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    msgEl.textContent = "❌ Save failed (check policies + RLS)";
    return;
  }

  msgEl.textContent = "Saved ✅";
}

document.getElementById("saveBtn").addEventListener("click", saveProfile);
document.getElementById("refreshBtn").addEventListener("click", loadProfile);

// start
loadProfile();
