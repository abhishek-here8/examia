(async function () {
  // must be logged in
  try {
    await window.EXAMIA_AUTH.requireLogin();
  } catch {
    window.location.href = "login.html";
    return;
  }

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const supabase = window.EXAMIA_AUTH.supabase; // IMPORTANT: auth.js must expose this

  // Hamburger menu
  const hamBtn = document.getElementById("hamBtn");
  const hamMenu = document.getElementById("hamMenu");
  hamBtn?.addEventListener("click", () => hamMenu?.classList.toggle("open"));
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#hamBtn") && !e.target.closest("#hamMenu")) {
      hamMenu?.classList.remove("open");
    }
  });

  // Logout
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await window.EXAMIA_AUTH.logout();
    window.location.href = "login.html";
  });

  // UI refs
  const profileFormCard = document.getElementById("profileFormCard");
  const profileViewCard = document.getElementById("profileViewCard");

  const nameEl = document.getElementById("name");
  const phoneEl = document.getElementById("phone");
  const classLevelEl = document.getElementById("classLevel");
  const addressEl = document.getElementById("address");
  const formMsg = document.getElementById("formMsg");

  const vName = document.getElementById("vName");
  const vPhone = document.getElementById("vPhone");
  const vClass = document.getElementById("vClass");
  const vAddress = document.getElementById("vAddress");
  const viewMsg = document.getElementById("viewMsg");

  const saveBtn = document.getElementById("saveProfileBtn");
  const editBtn = document.getElementById("editBtn");

  function showForm() {
    profileFormCard.style.display = "block";
    profileViewCard.style.display = "none";
  }
  function showView() {
    profileFormCard.style.display = "none";
    profileViewCard.style.display = "block";
  }

  async function getUserId() {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  }

  async function loadProfile() {
    const uid = await getUserId();
    if (!uid) {
      window.location.href = "login.html";
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();

    if (error) {
      viewMsg.textContent = "Error loading profile: " + error.message;
      showForm();
      return;
    }

    if (!data) {
      // new user
      showForm();
      return;
    }

    // show profile
    vName.textContent = data.name;
    vPhone.textContent = data.phone;
    vClass.textContent = data.class_level === "11" ? "11th" : "12th";
    vAddress.textContent = data.address;
    showView();
  }

  function validPhone(p) {
    return /^[0-9]{10}$/.test(p);
  }

  saveBtn?.addEventListener("click", async () => {
    formMsg.textContent = "";

    const uid = await getUserId();
    const name = (nameEl.value || "").trim();
    const phone = (phoneEl.value || "").trim();
    const class_level = (classLevelEl.value || "11").trim();
    const address = (addressEl.value || "").trim();

    if (!name) return (formMsg.textContent = "❌ Please enter name");
    if (!validPhone(phone)) return (formMsg.textContent = "❌ Phone must be 10 digits");
    if (!address) return (formMsg.textContent = "❌ Please enter address");

    formMsg.textContent = "Saving…";

    // upsert = insert if new, update if exists
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: uid, name, phone, class_level, address });

    if (error) {
      formMsg.textContent = "❌ Save failed: " + error.message;
      return;
    }

    formMsg.textContent = "✅ Saved!";
    await loadProfile();
  });

  editBtn?.addEventListener("click", async () => {
    // load current profile into form then show form
    const uid = await getUserId();
    const { data } = await supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle();
    if (data) {
      nameEl.value = data.name || "";
      phoneEl.value = data.phone || "";
      classLevelEl.value = data.class_level || "11";
      addressEl.value = data.address || "";
    }
    showForm();
  });

  // init
  loadProfile();
})();
