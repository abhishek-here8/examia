// =====================
// EXAMIA ADMIN (FULL FILE)
// =====================

// ===== CONFIG =====
const BACKEND_URL = "https://examiaa.onrender.com"; // <-- keep your correct backend url here
const TOKEN_KEY = "xamia_super_secret_key_2026_very_long_random_123456789"; // storage key name (NOT the token)

// Footer year
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Sections
const loginBox = document.getElementById("loginBox");
const adminPanel = document.getElementById("adminPanel");

// Login inputs
const adminId = document.getElementById("adminId");
const adminPass = document.getElementById("adminPass");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginMsg = document.getElementById("loginMsg");

// Filters
const subjectSel = document.getElementById("subjectSel");
const yearSel = document.getElementById("yearSel");
const modeSel = document.getElementById("modeSel");
const bucketName = document.getElementById("bucketName");

// Action selector + sections (NEW)
const adminAction = document.getElementById("adminAction");
const manageSection = document.getElementById("manageSection");
const addSection = document.getElementById("addSection");
const actionHint = document.getElementById("actionHint");

// Manage list
const adminList = document.getElementById("adminList");

// Add form
const newQ = document.getElementById("newQ");
const newA = document.getElementById("newA");
const addBtn = document.getElementById("addBtn");

// Messages + refresh
const adminMsg = document.getElementById("adminMsg");
const refreshBtn = document.getElementById("refreshBtn");

// ---------- Auth token helpers ----------
function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || "";
}
function setToken(t) {
  if (t) sessionStorage.setItem(TOKEN_KEY, t);
  else sessionStorage.removeItem(TOKEN_KEY);
}
function isAuthed() {
  return !!getToken();
}

// ---------- Safe HTML helpers ----------
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------- Panel view switching ----------
function updateAdminView() {
  const v = adminAction?.value || "manage";

  if (v === "add") {
    if (manageSection) manageSection.style.display = "none";
    if (addSection) addSection.style.display = "block";
    if (actionHint) actionHint.textContent = "Add mode: Fill details and click Add Question.";
  } else {
    if (manageSection) manageSection.style.display = "block";
    if (addSection) addSection.style.display = "none";
    if (actionHint) actionHint.textContent = "Manage mode: Delete questions from the list.";
    renderList();
  }
}

function showPanel() {
  const ok = isAuthed();
  if (adminPanel) adminPanel.style.display = ok ? "block" : "none";
  if (logoutBtn) logoutBtn.style.display = ok ? "inline-block" : "none";
  if (loginMsg) loginMsg.textContent = ok ? "Logged in ✅" : "";
  if (ok) updateAdminView();
}

// =====================
// API
// =====================
async function apiLogin(email, password) {
  const res = await fetch(`${BACKEND_URL}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return await res.json();
}

async function apiGetQuestions({ subject, year, mode, bucket }) {
  const url =
    `${BACKEND_URL}/questions?subject=${encodeURIComponent(subject)}` +
    `&year=${encodeURIComponent(year)}` +
    `&mode=${encodeURIComponent(mode)}` +
    `&bucket=${encodeURIComponent(bucket)}`;
  const res = await fetch(url);
  return await res.json();
}

async function apiAddQuestion(payload) {
  const res = await fetch(`${BACKEND_URL}/questions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

async function apiDeleteQuestion(id) {
  const res = await fetch(`${BACKEND_URL}/questions/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return await res.json();
}

async function apiUploadImage(file) {
  const base64 = await fileToBase64(file);

  const res = await fetch(`${BACKEND_URL}/upload-solution-image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({
      imageBase64: base64,
      fileName: file.name,
      mimeType: file.type,
    }),
  });

  return await res.json();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      // result is like: data:image/png;base64,AAAA...
      const full = String(r.result || "");
      const base64 = full.split(",")[1];
      resolve(base64);
    };
    r.onerror = () => reject("Failed to read file");
    r.readAsDataURL(file);
  });
}

// =====================
// UI RENDER
// =====================
async function renderList() {
  if (!adminList) return;

  const name = (bucketName?.value || "").trim();
  if (!name) {
    adminList.innerHTML = `<p class="muted">Type a Chapter / Paper name to manage questions.</p>`;
    return;
  }

  const subject = subjectSel?.value || "physics";
  const year = yearSel?.value || "2024";
  const mode = modeSel?.value || "chapters";

  const data = await apiGetQuestions({ subject, year, mode, bucket: name });

  if (!Array.isArray(data) || data.length === 0) {
    adminList.innerHTML = `<p class="muted">No questions yet for "${escapeHtml(name)}". Add one in Add mode.</p>`;
    return;
  }

  adminList.innerHTML = data
    .map((it, idx) => {
      const sol = (it.solution || "").trim();
      const img = (it.solution_image || "").trim();

      return `
        <div class="qCard">
          <div class="row" style="align-items:flex-start;">
            <div style="flex:1;min-width:240px;">
              <p class="qTitle">Q${idx + 1}</p>
              <p class="qText">${escapeHtml(it.question)}</p>

              ${img ? `<img src="${img}" alt="Solution" class="solution-img" data-solution-img="1" />` : ``}
              ${(!img && sol) ? `<p class="muted" style="margin:8px 0 0;">Sol: ${escapeHtml(sol)}</p>` : ``}
            </div>
            <button class="btnOutline" data-del="${it.id}" type="button">Delete</button>
          </div>
        </div>
      `;
    })
    .join("");
}

// =====================
// EVENTS
// =====================

// Login
loginBtn?.addEventListener("click", async () => {
  const email = (adminId?.value || "").trim();
  const password = (adminPass?.value || "").trim();

  const data = await apiLogin(email, password);

  if (data?.success && data?.token) {
    setToken(data.token);
    if (adminPass) adminPass.value = "";
    if (loginMsg) loginMsg.textContent = "Logged in ✅";
    showPanel();
  } else {
    if (loginMsg) loginMsg.textContent = "Wrong ID or password ❌";
  }
});

// Logout
logoutBtn?.addEventListener("click", () => {
  setToken("");
  showPanel();
});

// Switch Manage/Add
adminAction?.addEventListener("change", updateAdminView);

// Filter changes -> refresh list (only meaningful for manage mode)
[subjectSel, yearSel, modeSel, bucketName].forEach((el) => {
  el?.addEventListener("input", () => {
    if ((adminAction?.value || "manage") === "manage") renderList();
  });
});

// Refresh
refreshBtn?.addEventListener("click", async () => {
  if (adminMsg) adminMsg.textContent = "Refreshed ✅";
  await renderList();
});

// Delete
adminList?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-del]");
  if (!btn) return;

  const id = btn.getAttribute("data-del");
  const out = await apiDeleteQuestion(id);
  if (adminMsg) adminMsg.textContent = out?.success ? "Deleted ✅" : (out?.message || out?.error || "Delete failed ❌");
  await renderList();
});

// Click image to expand/collapse (optional, nice UX)
adminList?.addEventListener("click", (e) => {
  const img = e.target.closest("img[data-solution-img]");
  if (!img) return;
  img.classList.toggle("full");
});

// Add
addBtn?.addEventListener("click", async () => {
  const bucket = (bucketName?.value || "").trim();
  const question = (newQ?.value || "").trim();
  const solution = (newA?.value || "").trim();
  const fileInput = document.getElementById("solutionImage");
  const file = fileInput?.files?.[0];

  if (!bucket) return (adminMsg.textContent = "Type Chapter/Paper name first ❌");
  if (!question) return (adminMsg.textContent = "Question cannot be empty ❌");

  let solutionImageUrl = null;

  // Upload image if selected
  if (file) {
    adminMsg.textContent = "Uploading image...";
    const up = await apiUploadImage(file);
    if (!up?.success || !up?.imageUrl) {
      adminMsg.textContent = "❌ Image upload failed: " + (up?.error || "Unknown error");
      return;
    }
    solutionImageUrl = up.imageUrl;
  }

  adminMsg.textContent = "Saving question...";
  const out = await apiAddQuestion({
    subject: subjectSel?.value || "physics",
    year: Number(yearSel?.value || "2024"),
    mode: modeSel?.value || "chapters",
    bucket,
    question,
    solution, // optional
    solution_image: solutionImageUrl, // optional
  });

  if (out?.success) {
    if (newQ) newQ.value = "";
    if (newA) newA.value = "";
    if (fileInput) fileInput.value = "";
    adminMsg.textContent = "Added ✅ (Saved permanently)";
  } else {
    adminMsg.textContent = out?.message || out?.error || "Add failed ❌";
  }
});

// INIT
showPanel();
