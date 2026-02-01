// ===== CONFIG =====
const BACKEND_URL = "https://examiaa.onrender.com"; // <-- paste your Render backend URL here

// Footer year
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Fallback DB (from questions.js)
const FALLBACK = window.EXAMIA_QUESTIONS || {};

// Current selection
let selectedSubject = "physics";
let selectedYear = "2024";
let selectedMode = "chapters"; // "chapters" | "papers"
let selectedListKey = null;    // chapter name or paper name

// Cache for DB data
let dbRowsCache = []; // rows from backend for current subject/year/mode

function setActive(groupEl, value, attr) {
  if (!groupEl) return;
  groupEl.querySelectorAll(".chip").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute(attr) === value);
  });
}

// --------------------
// BACKEND (DB) LOADING
// --------------------
async function loadDbRows() {
  // Load all rows for subject/year/mode (we group them by bucket in frontend)
  const url =
    `${BACKEND_URL}/questions?subject=${encodeURIComponent(selectedSubject)}` +
    `&year=${encodeURIComponent(selectedYear)}` +
    `&mode=${encodeURIComponent(selectedMode)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (Array.isArray(data)) return data;
    return [];
  } catch {
    return [];
  }
}

function groupRowsByBucket(rows) {
  const buckets = {};
  for (const r of rows) {
    const b = r.bucket || "Unknown";
    if (!buckets[b]) buckets[b] = [];
    buckets[b].push(r);
  }
  return buckets;
}

// --------------------
// FALLBACK (questions.js)
// --------------------
function getFallbackBucket() {
  return (FALLBACK?.[selectedSubject]?.[selectedYear]?.[selectedMode]) || {};
}

// --------------------
// UI RENDER
// --------------------
async function refreshCacheAndUI() {
  // 1) Try DB
  dbRowsCache = await loadDbRows();

  // 2) Render list buttons + questions
  await renderListButtons();
  renderQuestions();
}

async function renderListButtons() {
  const listChips = document.getElementById("listChips");
  if (!listChips) return;

  // Prefer DB buckets if DB has rows
  let bucketMap = {};
  let source = "fallback"; // for debugging in your mind

  if (dbRowsCache.length > 0) {
    bucketMap = groupRowsByBucket(dbRowsCache);
    source = "db";
  } else {
    bucketMap = getFallbackBucket();
    source = "fallback";
  }

  const keys = Object.keys(bucketMap);

  if (keys.length === 0) {
    listChips.innerHTML = `<p class="muted" style="margin:8px 0 0">No ${selectedMode} added yet.</p>`;
    selectedListKey = null;
    return;
  }

  // If selectedListKey is missing/invalid, choose first
  if (!selectedListKey || !bucketMap[selectedListKey]) {
    selectedListKey = keys[0];
  }

  listChips.innerHTML = keys
    .map(k => `<button class="chip ${k === selectedListKey ? "active" : ""}" data-key="${k}">${k}</button>`)
    .join("");

  // (Optional) You can check source by console:
  // console.log("List source:", source);
}

function renderQuestions() {
  const pickedSubject = document.getElementById("pickedSubject");
  const pickedYear = document.getElementById("pickedYear");
  const list = document.getElementById("questionList");

  if (!list) return;

  const prettySubject =
    selectedSubject === "physics" ? "Physics" :
    selectedSubject === "chemistry" ? "Chemistry" : "Maths";

  if (pickedSubject) pickedSubject.textContent = prettySubject;
  if (pickedYear) pickedYear.textContent = selectedYear;

  if (!selectedListKey) {
    list.innerHTML = `<p class="muted">Pick a ${selectedMode === "chapters" ? "chapter" : "paper"} to see questions.</p>`;
    return;
  }

  // Choose DB if available, else fallback
  let items = [];
  if (dbRowsCache.length > 0) {
    const bucketMap = groupRowsByBucket(dbRowsCache);
    items = bucketMap[selectedListKey] || [];

    // DB rows format: { id, question, solution }
    list.innerHTML = items.map((row, idx) => {
      const hasSol = row.solution && String(row.solution).trim().length > 0;
      return `
        <div class="qCard">
          <p class="qTitle">Q${idx + 1}</p>
          <p class="qText">${escapeHtml(row.question)}</p>

          ${hasSol ? `
            <button class="btnOutline" style="margin-top:10px" data-toggle-ans="${idx}">
              Show solution
            </button>
            <p class="muted" style="margin:10px 0 0; display:none" id="ans-${idx}">
              ${escapeHtml(row.solution)}
            </p>
          ` : ``}
        </div>
      `;
    }).join("");

  } else {
    const bucket = getFallbackBucket();
    items = bucket[selectedListKey] || [];

    // Fallback format: { q, ans }
    list.innerHTML = items.map((item, idx) => {
      const hasAns = item.ans && item.ans.trim().length > 0;
      return `
        <div class="qCard">
          <p class="qTitle">Q${idx + 1}</p>
          <p class="qText">${escapeHtml(item.q)}</p>

          ${hasAns ? `
            <button class="btnOutline" style="margin-top:10px" data-toggle-ans="${idx}">
              Show solution
            </button>
            <p class="muted" style="margin:10px 0 0; display:none" id="ans-${idx}">
              ${escapeHtml(item.ans)}
            </p>
          ` : ``}
        </div>
      `;
    }).join("");
  }
}

// Safe HTML display
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// --------------------
// EVENT HOOKS
// --------------------
const subjectChips = document.getElementById("subjectChips");
const yearChips = document.getElementById("yearChips");
const modeChips = document.getElementById("modeChips");
const listChips = document.getElementById("listChips");
const questionList = document.getElementById("questionList");

if (subjectChips && yearChips && modeChips && listChips && questionList) {
  subjectChips.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    selectedSubject = btn.dataset.subject;
    setActive(subjectChips, selectedSubject, "data-subject");
    selectedListKey = null;
    await refreshCacheAndUI();
  });

  yearChips.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    selectedYear = btn.dataset.year;
    setActive(yearChips, selectedYear, "data-year");
    selectedListKey = null;
    await refreshCacheAndUI();
  });

  modeChips.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    selectedMode = btn.dataset.mode;
    setActive(modeChips, selectedMode, "data-mode");
    selectedListKey = null;
    await refreshCacheAndUI();
  });

  listChips.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-key]");
    if (!btn) return;
    selectedListKey = btn.dataset.key;

    listChips.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");

    renderQuestions();
  });

  // Show/Hide solution
  questionList.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-toggle-ans]");
    if (!btn) return;
    const idx = btn.getAttribute("data-toggle-ans");
    const ansEl = document.getElementById(`ans-${idx}`);
    if (!ansEl) return;

    const isHidden = ansEl.style.display === "none";
    ansEl.style.display = isHidden ? "block" : "none";
    btn.textContent = isHidden ? "Hide solution" : "Show solution";
  });

  // First load
  refreshCacheAndUI();
}
