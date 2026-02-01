const BACKEND_URL = "https://examiaa.onrender.com"; // example: https://examiaa-xxxx.onrender.com

// year footer
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// DOM
const loginBox = document.getElementById("loginBox");
const adminPanel = document.getElementById("adminPanel");

const adminId = document.getElementById("adminId");
const adminPass = document.getElementById("adminPass");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginMsg = document.getElementById("loginMsg");

const subjectSel = document.getElementById("subjectSel");
const yearSel = document.getElementById("yearSel");
const modeSel = document.getElementById("modeSel");
const bucketName = document.getElementById("bucketName");

const adminList = document.getElementById("adminList");
const newQ = document.getElementById("newQ");
const newA = document.getElementById("newA");
const addBtn = document.getElementById("addBtn");
const exportBtn = document.getElementById("exportBtn");
const exportBox = document.getElementById("exportBox");
const adminMsg = document.getElementById("adminMsg");
const resetBtn = document.getElementById("resetBtn");

const TOKEN_KEY = "EXAMIA_ADMIN_TOKEN";

// helpers
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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

function showPanel() {
  const ok = isAuthed();
  adminPanel.style.display = ok ? "block" : "none";
  logoutBtn.style.display = ok ? "inline-block" : "none";
  loginMsg.textContent = ok ? "Logged in ✅" : "";
  if (ok) renderList();
}

// API calls
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
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
  return await res.json();
}

// UI render
async function renderList() {
  const name = bucketName.value.trim();
  if (!name) {
    adminList.innerHTML = `<p class="muted">Type a Chapter / Paper name to manage questions.</p>`;
    return;
  }

  const subject = subjectSel.value;
  const year = yearSel.value;
  const mode = modeSel.value;

  const data = await apiGetQuestions({ subject, year, mode, bucket: name });

  if (!Array.isArray(data) || data.length === 0) {
    adminList.innerHTML = `<p class="muted">No questions yet for "${escapeHtml(name)}". Add one below.</p>`;
    return;
  }

  adminList.innerHTML = data
    .map((it, idx) => {
      const sol = (it.solution || "").trim();
      return `
        <div class="qCard">
          <div class="row" style="align-items:flex-start;">
            <div style="flex:1;min-width:240px;">
              <p class="qTitle">Q${idx + 1}</p>
              <p class="qText">${escapeHtml(it.question)}</p>
              ${sol ? `<p class="muted" style="margin:8px 0 0;">Sol: ${escapeHtml(sol)}</p>` : ``}
            </div>
            <button class="btnOutline" data-del="${it.id}" type="button">Delete</button>
          </div>
        </div>
      `;
    })
    .join("");
}

// events
loginBtn?.addEventListener("click", async () => {
  const email = (adminId.value || "").trim();
  const password = (adminPass.value || "").trim();

  const res = await fetch(`${BACKEND_URL}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (data?.success && data?.token) {
    setToken(data.token);
    adminPass.value = "";
    loginMsg.textContent = "Logged in ✅";
    showPanel();
  } else {
    loginMsg.textContent = "Wrong ID or password ❌";
  }
});

logoutBtn?.addEventListener("click", () => {
  setToken("");
  showPanel();
});

[subjectSel, yearSel, modeSel, bucketName].forEach((el) => {
  el?.addEventListener("input", () => renderList());
});

adminList?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-del]");
  if (!btn) return;

  const id = btn.getAttribute("data-del");
  const out = await apiDeleteQuestion(id);

  adminMsg.textContent = out?.success ? "Deleted ✅" : (out?.message || out?.error || "Delete failed ❌");
  await renderList();
});

addBtn?.addEventListener("click", async () => {
  const bucket = bucketName.value.trim();
  const question = (newQ.value || "").trim();
  const solution = (newA.value || "").trim();

  if (!bucket) return (adminMsg.textContent = "Type Chapter/Paper name first ❌");
  if (!question) return (adminMsg.textContent = "Question cannot be empty ❌");

  const payload = {
    subject: subjectSel.value,
    year: Number(yearSel.value),
    mode: modeSel.value,
    bucket,
    question,
    solution,
  };

  const out = await apiAddQuestion(payload);

  if (out?.success) {
    newQ.value = "";
    newA.value = "";
    adminMsg.textContent = "Added ✅ (Saved permanently)";
    await renderList();
  } else {
    adminMsg.textContent = out?.message || out?.error || "Add failed ❌";
  }
});

// Export is not needed now, but keep it disabled (optional)
exportBtn?.addEventListener("click", () => {
  exportBox.value = "Not needed now ✅ Questions save permanently in Supabase.";
});

// Reset button just reloads list
resetBtn?.addEventListener("click", async () => {
  adminMsg.textContent = "Refreshed ✅";
  await renderList();
});

// init
showPanel();
