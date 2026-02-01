// Footer year
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Read data loaded from questions.js
const DB = window.EXAMIA_QUESTIONS || {};

let selectedSubject = "physics";
let selectedYear = "2024";
let selectedMode = "chapters"; // "chapters" | "papers"
let selectedListKey = null;    // chapter name or paper name

function setActive(groupEl, value, attr) {
  if (!groupEl) return;
  groupEl.querySelectorAll(".chip").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute(attr) === value);
  });
}

function getBucket() {
  return (DB?.[selectedSubject]?.[selectedYear]?.[selectedMode]) || {};
}

function renderListButtons() {
  const listChips = document.getElementById("listChips");
  if (!listChips) return;

  const bucket = getBucket();
  const keys = Object.keys(bucket);

  if (keys.length === 0) {
    listChips.innerHTML = `<p class="muted" style="margin:8px 0 0">No ${selectedMode} added yet.</p>`;
    selectedListKey = null;
    renderQuestions();
    return;
  }

  if (!selectedListKey || !bucket[selectedListKey]) {
    selectedListKey = keys[0];
  }

  listChips.innerHTML = keys
    .map(k => `<button class="chip ${k === selectedListKey ? "active" : ""}" data-key="${k}">${k}</button>`)
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

  const bucket = getBucket();
  const items = selectedListKey ? (bucket[selectedListKey] || []) : [];

  if (!selectedListKey) {
    list.innerHTML = `<p class="muted">Pick a ${selectedMode === "chapters" ? "chapter" : "paper"} to see questions.</p>`;
    return;
  }

  list.innerHTML = items.map((item, idx) => {
    const hasAns = item.ans && item.ans.trim().length > 0;
    return `
      <div class="qCard">
        <p class="qTitle">Q${idx + 1}</p>
        <p class="qText">${item.q}</p>

        ${hasAns ? `
          <button class="btnOutline" style="margin-top:10px" data-toggle-ans="${idx}">
            Show answer
          </button>
          <p class="muted" style="margin:10px 0 0; display:none" id="ans-${idx}">
            ${item.ans}
          </p>
        ` : ``}
      </div>
    `;
  }).join("");
}

function refreshAll() {
  renderListButtons();
  renderQuestions();
}

// Hook UI
const subjectChips = document.getElementById("subjectChips");
const yearChips = document.getElementById("yearChips");
const modeChips = document.getElementById("modeChips");
const listChips = document.getElementById("listChips");
const questionList = document.getElementById("questionList");

if (subjectChips && yearChips && modeChips && listChips && questionList) {
  subjectChips.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    selectedSubject = btn.dataset.subject;
    setActive(subjectChips, selectedSubject, "data-subject");
    selectedListKey = null;
    refreshAll();
  });

  yearChips.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    selectedYear = btn.dataset.year;
    setActive(yearChips, selectedYear, "data-year");
    selectedListKey = null;
    refreshAll();
  });

  modeChips.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    selectedMode = btn.dataset.mode;
    setActive(modeChips, selectedMode, "data-mode");
    selectedListKey = null;
    refreshAll();
  });

  listChips.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    selectedListKey = btn.dataset.key;
    listChips.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    renderQuestions();
  });

  // Show/Hide answer
  questionList.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-toggle-ans]");
    if (!btn) return;
    const idx = btn.getAttribute("data-toggle-ans");
    const ansEl = document.getElementById(`ans-${idx}`);
    if (!ansEl) return;

    const isHidden = ansEl.style.display === "none";
    ansEl.style.display = isHidden ? "block" : "none";
    btn.textContent = isHidden ? "Hide answer" : "Show answer";
  });

  refreshAll();
}
