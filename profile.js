const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

const statusLine = document.getElementById("statusLine");

const viewCard = document.getElementById("viewCard");
const editCard = document.getElementById("editCard");
const verifyCard = document.getElementById("verifyCard");

const editBtn = document.getElementById("editBtn");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const editMsg = document.getElementById("editMsg");

const nameEl = document.getElementById("name");
const phoneEl = document.getElementById("phone");
const classLevelEl = document.getElementById("classLevel");
const addressEl = document.getElementById("address");

const vEmail = document.getElementById("vEmail");
const vName = document.getElementById("vName");
const vPhone = document.getElementById("vPhone");
const vClass = document.getElementById("vClass");
const vAddr = document.getElementById("vAddr");
const vVerified = document.getElementById("vVerified");

const pvPhone = document.getElementById("pvPhone");
const pvOtp = document.getElementById("pvOtp");
const sendOtpBtn = document.getElementById("sendOtpBtn");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");
const pvMsg = document.getElementById("pvMsg");

const logoutBtn = document.getElementById("logoutBtn");

function showOnly(which) {
  viewCard.style.display = which === "view" ? "block" : "none";
  editCard.style.display = which === "edit" ? "block" : "none";
  verifyCard.style.display = which === "verify" ? "block" : "none";
}

function profileComplete(p) {
  if (!p) return false;
  return !!(p.name && p.phone && p.class_level && p.address);
}

function fillView(user, p) {
  vEmail.textContent = user?.email || "-";
  vName.textContent = p?.name || "-";
  vPhone.textContent = p?.phone || "-";
  vClass.textContent = p?.class_level || "-";
  vAddr.textContent = p?.address || "-";
  vVerified.textContent = p?.phone_verified_at ? "✅ Verified" : "❌ Not verified";
}

function fillEdit(p) {
  nameEl.value = p?.name || "";
  phoneEl.value = p?.phone || "";
  classLevelEl.value = p?.class_level || "";
  addressEl.value = p?.address || "";
}

async function refreshProfile() {
  statusLine.textContent = "Loading...";
  editMsg.textContent = "";
  pvMsg.textContent = "";

  const { user, profile } = await window.EXAMIA_AUTH.getMyProfile();

  // 1) If profile incomplete -> ask for details
  if (!profileComplete(profile)) {
    statusLine.textContent = "Complete your profile to continue.";
    fillEdit(profile);
    showOnly("edit");
    return;
  }

  // 2) If phone not verified -> verify
  if (!window.EXAMIA_AUTH.isPhoneVerified(profile)) {
    statusLine.textContent = "Verify your phone number.";
    pvPhone.value = profile.phone || "";
    showOnly("verify");
    return;
  }

  // 3) All good -> show details
  statusLine.textContent = "Profile ready ✅";
  fillView(user, profile);
  showOnly("view");
}

editBtn?.addEventListener("click", async () => {
  const { profile } = await window.EXAMIA_AUTH.getMyProfile();
  fillEdit(profile);
  showOnly("edit");
});

cancelBtn?.addEventListener("click", () => refreshProfile());

saveBtn?.addEventListener("click", async () => {
  const name = nameEl.value.trim();
  const phone = phoneEl.value.trim();
  const class_level = classLevelEl.value.trim();
  const address = addressEl.value.trim();

  if (!name) return (editMsg.textContent = "Name required ❌");
  if (!phone) return (editMsg.textContent = "Phone required ❌");
  if (!class_level) return (editMsg.textContent = "Class required ❌");
  if (!address) return (editMsg.textContent = "Address required ❌");

  editMsg.textContent = "Saving...";
  await window.EXAMIA_AUTH.upsertMyProfile({ name, phone, class_level, address });
  editMsg.textContent = "Saved ✅";

  await refreshProfile();
});

sendOtpBtn?.addEventListener("click", async () => {
  const phone = pvPhone.value.trim();
  if (!phone) return (pvMsg.textContent = "Enter phone ❌");

  pvMsg.textContent = "Sending OTP...";
  try {
    await window.EXAMIA_AUTH.sendPhoneOtp(phone); // you already added this in auth.js
    pvMsg.textContent = "OTP sent ✅";
  } catch (e) {
    pvMsg.textContent = "❌ " + (e?.message || e);
  }
});

verifyOtpBtn?.addEventListener("click", async () => {
  const phone = pvPhone.value.trim();
  const token = pvOtp.value.trim();
  if (!phone) return (pvMsg.textContent = "Enter phone ❌");
  if (!token) return (pvMsg.textContent = "Enter OTP ❌");

  pvMsg.textContent = "Verifying...";
  try {
    await window.EXAMIA_AUTH.verifyPhoneOtp(phone, token); // you already added this in auth.js

    // mark verified in profiles table (timestamp)
    await window.EXAMIA_AUTH.upsertMyProfile({ phone, phone_verified_at: new Date().toISOString() });

    pvMsg.textContent = "Verified ✅";
    await refreshProfile();
  } catch (e) {
    pvMsg.textContent = "❌ " + (e?.message || e);
  }
});

logoutBtn?.addEventListener("click", () => window.EXAMIA_AUTH.logout());

// init
window.EXAMIA_AUTH.requireLogin(); // ensures logged in
window.EXAMIA_AUTH.setupMenu?.();  // if you have ham menu helper
refreshProfile().catch((e) => {
  statusLine.textContent = "❌ " + (e?.message || e);
});
