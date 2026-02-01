// Simple year
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Static credentials (NOT secure in frontend)
const ADMIN_ID = "examia@110906";
const ADMIN_PASS = "examia110906";

// Base DB from questions.js
const BASE = window.EXAMIA_QUESTIONS || {};

// Storage keys
const KEY_AUTH = "EXAMIA_ADMIN_AUTH";
const KEY_DB = "EXAMIA_DB_OVERRIDE";

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

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Load override DB if exists; else clone BASE
function loadDB() {
  const raw = localStorage.getItem(KEY_DB);
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }
  return deepClone(BASE);
}

function saveDB(db) {
  localStorage.setItem(KEY_DB, JSON.stringify(db));
}

function isAuthed() {
  return localStorage.getItem(KEY_AUTH) === "1";
}

function setAuthed(v) {
  localStorage.setItem(KEY_AUTH, v ? "1" : "0");
}

let DB = loadDB();

function ensurePaths(sub, yr) {
  DB[sub] ??= {};
  DB[sub][yr] ??= { chapters: {}, papers: {} };
  DB[sub][yr].chapters ??= {};
  DB[sub][yr].papers ??= {};
}

function getBucket() {
  const sub = subjectSel.value;
  const yr = yearSel.value;
  const mode = modeSel.value; // chapters/papers
  ensurePaths(sub, yr);
  return DB[sub][yr][mode];
}

function renderList() {
  const name = bucketName.value.trim();
  const bucket = getBucket();

  if (!name) {
    adminList.innerHTML = `<p class="muted">Type a Chapter / Paper name to manage questions.</p>`;
    return;
  }

  const arr = bucket[name] || [];
  if (arr.length === 0) {
    adminList.innerHTML = `<p class="muted">No questions yet for "${name}". Add one below.</p>`;
    return;
  }

  adminList.innerHTML = arr.map((it, idx) => {
    const ans = (it.ans || "").trim();
    return `
      <div class="qCard">
        <div class="row" style="align-items:flex-start;">
          <div style="flex:1;min-width:240px;">
            <p class="qTitle">Q${idx + 1}</p>
            <p class="qText">${escapeHtml(it.q)}</p>
            ${ans ? `<p class="muted" style="margin:8px 0 0;">Ans: ${escapeHtml(ans)}</p>` : ``}
          </div>
          <button class="btnOutline" data-del="${idx}" type="button">Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showPanel() {
  const ok = isAuthed();
  loginBox.style.display = "block";
  adminPanel.style.display = ok ? "block" : "none";
  logoutBtn.style.display = ok ? "inline-block" : "none";
  loginMsg.textContent = ok ? "Logged in ✅" : "";
  if (ok) renderList();
}

// Login
loginBtn?.addEventListener("click", () => {
  const id = (adminId.value || "").trim();
  const pw = (adminPass.value || "").trim();

  if (id === ADMIN_ID && pw === ADMIN_PASS) {
    setAuthed(true);
    loginMsg.textContent = "Logged in ✅";
    adminPass.value = "";
    showPanel();
  } else {
    loginMsg.textContent = "Wrong ID or password ❌";
  }
});

// Logout
logoutBtn?.addEventListener("click", () => {
  setAuthed(false);
  showPanel();
});

// Re-render on filters change
[subjectSel, yearSel, modeSel, bucketName].forEach(el => {
  el?.addEventListener("input", () => renderList());
});

// Delete handler
adminList?.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-del]");
  if (!btn) return;

  const idx = Number(btn.getAttribute("data-del"));
  const name = bucketName.value.trim();
  if (!name) return;

  const bucket = getBucket();
  const arr = bucket[name] || [];
  arr.splice(idx, 1);

  // If empty, keep the bucket but it will show "no questions"
  bucket[name] = arr;
  saveDB(DB);
  adminMsg.textContent = "Deleted ✅";
  renderList();
});

// Add question
addBtn?.addEventListener("click", () => {
  const name = bucketName.value.trim();
  const q = (newQ.value || "").trim();
  const a = (newA.value || "").trim();

  if (!name) {
    adminMsg.textContent = "Type Chapter/Paper name first ❌";
    return;
  }
  if (!q) {
    adminMsg.textContent = "Question cannot be empty ❌";
    return;
  }

  const bucket = getBucket();
  bucket[name] ??= [];
  bucket[name].push({ q, ans: a });

  saveDB(DB);
  newQ.value = "";
  newA.value = "";
  adminMsg.textContent = "Added ✅";
  renderList();
});

// Export
exportBtn?.addEventListener("click", () => {
  // Export as questions.js content
  const js = "window.EXAMIA_QUESTIONS = " + JSON.stringify(DB, null, 2) + ";\n";
  exportBox.value = js;
  adminMsg.textContent = "Exported ✅ Now copy and paste into questions.js on GitHub.";
});

// Reset to GitHub data
resetBtn?.addEventListener("click", () => {
  DB = deepClone(BASE);
  saveDB(DB);
  adminMsg.textContent = "Reset to GitHub data ✅";
  renderList();
});

// Init
showPanel();
