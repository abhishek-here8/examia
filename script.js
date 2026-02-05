// ===== CONFIG =====
const BACKEND_URL = "https://examiaa.onrender.com"; // example: https://examiaa-xxxx.onrender.com

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
  dbRowsCache = await loadDbRows();
  await renderListButtons();
  renderQuestions();
}

async function renderListButtons() {
  const listChips = document.getElementById("listChips");
  if (!listChips) return;

  // Prefer DB buckets if DB has rows, else fallback
  let bucketMap = {};
  if (dbRowsCache.length > 0) {
    bucketMap = groupRowsByBucket(dbRowsCache);
  } else {
    bucketMap = getFallbackBucket();
  }

  const keys = Object.keys(bucketMap);

  if (keys.length === 0) {
    listChips.innerHTML = `<p class="muted" style="margin:8px 0 0">No ${selectedMode} added yet.</p>`;
    selectedListKey = null;
    return;
  }

  // If selection missing or invalid, pick first
  if (!selectedListKey || !bucketMap[selectedListKey]) {
    selectedListKey = keys[0];
  }

  listChips.innerHTML = keys
    .map(k => `<button class="chip ${k === selectedListKey ? "active" : ""}" data-key="${escapeHtml(k)}">${escapeHtml(k)}</button>`)
    .join("");
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
  if (dbRowsCache.length > 0) {
    const bucketMap = groupRowsByBucket(dbRowsCache);
    const items = bucketMap[selectedListKey] || [];

    list.innerHTML = items.map((row, idx) => {
      const textSol = (row.solution || "").trim();
      const imgSol = (row.solution_image || "").trim();

      const hasAnySol = !!imgSol || !!textSol;

      return `
        <div class="qCard">
          <p class="qTitle">Q${idx + 1}</p>
          <p class="qText">${escapeHtml(row.question)}</p>

          ${hasAnySol ? `
            <button class="btnOutline" style="margin-top:10px" data-toggle-ans="${idx}">
              Show solution
            </button>

            <div class="muted" style="margin:10px 0 0; display:none" id="ans-${idx}">
              ${imgSol ? `
                <img src="${escapeAttr(imgSol)}" alt="Solution" class="solution-img" data-solution-img="1" />
              ` : ``}
              ${(!imgSol && textSol) ? `
                <p style="margin:0;">${escapeHtml(textSol)}</p>
              ` : ``}
            </div>
          ` : ``}
        </div>
      `;
    }).join("");

  } else {
    // Fallback format: { q, ans }
    const bucket = getFallbackBucket();
    const items = bucket[selectedListKey] || [];

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

// --------------------
// Safe HTML helpers
// --------------------
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  // For URLs inside attributes
  return String(str)
    .replaceAll('"', "%22")
    .replaceAll("<", "%3C")
    .replaceAll(">", "%3E");
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

  // Show/Hide solution (works for text + image)
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
