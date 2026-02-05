(async () => {
  // must be logged in
  try {
    await window.EXAMIA_AUTH.requireLogin();
    window.EXAMIA_AUTH.setupMenu?.();
  } catch (e) {
    location.href = "login.html";
    return;
  }

  const statusLine = document.getElementById("statusLine");
  const verifyState = document.getElementById("verifyState");
  const msg = document.getElementById("msg");
  const otpMsg = document.getElementById("otpMsg");

  const nameEl = document.getElementById("name");
  const phoneEl = document.getElementById("phone");
  const classEl = document.getElementById("classLevel");
  const addrEl = document.getElementById("address");

  const otpBox = document.getElementById("otpBox");
  const otpEl = document.getElementById("otp");

  function showVerified(profile) {
    const ok = !!profile?.phone_verified_at;
    verifyState.textContent = ok
      ? `✅ Phone verified on ${new Date(profile.phone_verified_at).toLocaleString()}`
      : `❌ Phone not verified`;
  }

  // Load profile and fill form
  async function loadProfile() {
    statusLine.textContent = "Loading profile…";
    msg.textContent = "";
    otpMsg.textContent = "";
    otpBox.style.display = "none";

    try {
      const p = await window.EXAMIA_AUTH.getProfile();
      if (p) {
        nameEl.value = p.name || "";
        phoneEl.value = p.phone || "";
        classEl.value = String(p.class_level || "11");
        addrEl.value = p.address || "";
        showVerified(p);
        statusLine.textContent = "Profile loaded ✅";
      } else {
        // no profile yet
        statusLine.textContent = "Fill your profile and save ✅";
        verifyState.textContent = "❌ Phone not verified";
      }
    } catch (e) {
      statusLine.textContent = "❌ Failed to load profile";
      msg.textContent = "❌ " + (e.message || e);
    }
  }

  // Save profile
  document.getElementById("saveBtn").addEventListener("click", async () => {
    const name = nameEl.value.trim();
    const phone = phoneEl.value.trim();
    const class_level = classEl.value;
    const address = addrEl.value.trim();

    if (!name) return (msg.textContent = "❌ Enter your name");
    if (!phone || !phone.startsWith("+")) return (msg.textContent = "❌ Phone must be like +91XXXXXXXXXX");

    try {
      msg.textContent = "Saving…";
      await window.EXAMIA_AUTH.saveProfile({ name, phone, class_level, address });
      msg.textContent = "✅ Saved. Now verify phone below.";
      await loadProfile();
    } catch (e) {
      msg.textContent = "❌ " + (e.message || e);
    }
  });

  // Send OTP
  document.getElementById("sendOtpBtn").addEventListener("click", async () => {
    const phone = phoneEl.value.trim();
    if (!phone || !phone.startsWith("+")) return (otpMsg.textContent = "❌ Save phone first (with + code)");

    try {
      otpMsg.textContent = "Sending OTP…";
      await window.EXAMIA_AUTH.sendPhoneOtp(phone);
      otpMsg.textContent = "✅ OTP sent. Check SMS.";
      otpBox.style.display = "block";
      otpEl.focus();
    } catch (e) {
      otpMsg.textContent = "❌ " + (e.message || e);
    }
  });

  // Verify OTP
  document.getElementById("verifyOtpBtn").addEventListener("click", async () => {
    const phone = phoneEl.value.trim();
    const token = otpEl.value.trim();
    if (!token) return (otpMsg.textContent = "❌ Enter OTP");

    try {
      otpMsg.textContent = "Verifying…";
      await window.EXAMIA_AUTH.verifyPhoneOtp(phone, token);
      await window.EXAMIA_AUTH.markPhoneVerifiedAt();

      otpMsg.textContent = "✅ Phone verified!";
      await loadProfile();
    } catch (e) {
      otpMsg.textContent = "❌ " + (e.message || e);
    }
  });

  await loadProfile();
})();
