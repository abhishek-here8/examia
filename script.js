const BACKEND_URL = "https://examiaa.onrender.com"; // your Render backend

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

const subjectSelect = document.getElementById("subjectSelect");
const yearSelect = document.getElementById("yearSelect");
const modeSelect = document.getElementById("modeSelect");
const bucketSelect = document.getElementById("bucketSelect");
const loadBtn = document.getElementById("loadBtn");
const clearBtn = document.getElementById("clearBtn");
const filterMsg = document.getElementById("filterMsg");

const pickedSubject = document.getElementById("pickedSubject");
const pickedYear = document.getElementById("pickedYear");
const questionList = document.getElementById("questionList");

// fallback
const FALLBACK = window.EXAMIA_QUESTIONS || {};
let dbRowsCache = [];

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return String(str).replaceAll('"', "%22").replaceAll("<", "%3C").replaceAll(">", "%3E");
}

function prettySubject(v) {
  if (v === "physics") return "Physics";
  if (v === "chemistry") return "Chemistry";
  return "Maths";
}

async function loadDbRows(subject, year, mode) {
  const url =
    `${BACKEND_URL}/questions?subject=${encodeURIComponent(subject)}` +
    `&year=${encodeURIComponent(year)}` +
    `&mode=${encodeURIComponent(mode)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function groupRowsByBucket(rows) {
  const out = {};
  for (const r of rows) {
    const b = r.bucket || "Unknown";
    if (!out[b]) out[b] = [];
    out[b].push(r);
  }
  return out;
}

function getFallbackBucket(subject, year, mode) {
  return (FALLBACK?.[subject]?.[year]?.[mode]) || {};
}

async function refreshBucketDropdown() {
  const subject = subjectSelect.value;
  const year = yearSelect.value;
  const mode = modeSelect.value;

  filterMsg.textContent = "Loading list…";
  bucketSelect.innerHTML = `<option value="">Select…</option>`;
  questionList.innerHTML = `<p class="muted">Pick filters and click “Load Questions”.</p>`;

  dbRowsCache = await loadDbRows(subject, year, mode);

  let bucketKeys = [];
  if (dbRowsCache.length > 0) {
    bucketKeys = Object.keys(groupRowsByBucket(dbRowsCache));
  } else {
    bucketKeys = Object.keys(getFallbackBucket(subject, year, mode));
  }

  if (bucketKeys.length === 0) {
    filterMsg.textContent = `No ${mode === "chapters" ? "chapters" : "papers"} found for ${prettySubject(subject)} ${year}.`;
    return;
  }

  bucketKeys.sort((a, b) => a.localeCompare(b));

  for (const k of bucketKeys) {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = k;
    bucketSelect.appendChild(opt);
  }

  filterMsg.textContent = "Select a chapter/paper, then click Load Questions.";
}

function renderQuestions() {
  const subject = subjectSelect.value;
  const year = yearSelect.value;
  const mode = modeSelect.value;
  const bucket = bucketSelect.value;

  if (!bucket) {
    filterMsg.textContent = "Please select Chapter/Paper first.";
    return;
  }

  if (pickedSubject) pickedSubject.textContent = prettySubject(subject);
  if (pickedYear) pickedYear.textContent = year;

  // Prefer DB
  if (dbRowsCache.length > 0) {
    const map = groupRowsByBucket(dbRowsCache);
    const items = map[bucket] || [];

    if (items.length === 0) {
      questionList.innerHTML = `<p class="muted">No questions in this selection.</p>`;
      return;
    }

    questionList.innerHTML = items.map((row, idx) => {
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
              ${(!imgSol && textSol) ? `<p style="margin:0;">${escapeHtml(textSol)}</p>` : ``}
            </div>
          ` : ``}
        </div>
      `;
    }).join("");

  } else {
    // Fallback
    const bucketMap = getFallbackBucket(subject, year, mode);
    const items = bucketMap[bucket] || [];

    if (items.length === 0) {
      questionList.innerHTML = `<p class="muted">No questions in this selection.</p>`;
      return;
    }

    questionList.innerHTML = items.map((item, idx) => {
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

  filterMsg.textContent = `Showing ${prettySubject(subject)} • ${year} • ${mode === "chapters" ? "Chapter" : "Paper"}: ${bucket}`;
}

// Events
[subjectSelect, yearSelect, modeSelect].forEach(el => {
  el.addEventListener("change", refreshBucketDropdown);
});

loadBtn.addEventListener("click", renderQuestions);

clearBtn.addEventListener("click", () => {
  bucketSelect.value = "";
  filterMsg.textContent = "Cleared. Select filters again.";
  questionList.innerHTML = `<p class="muted">Pick filters and click “Load Questions”.</p>`;
});

// click image to expand
questionList.addEventListener("click", (e) => {
  const img = e.target.closest("img[data-solution-img]");
  if (img) {
    img.classList.toggle("full");
    return;
  }

  const btn = e.target.closest("button[data-toggle-ans]");
  if (!btn) return;

  const idx = btn.getAttribute("data-toggle-ans");
  const ansEl = document.getElementById(`ans-${idx}`);
  if (!ansEl) return;

  const isHidden = ansEl.style.display === "none";
  ansEl.style.display = isHidden ? "block" : "none";
  btn.textContent = isHidden ? "Hide solution" : "Show solution";
});

// init
refreshBucketDropdown();
