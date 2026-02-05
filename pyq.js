// ===== CONFIG =====
const BACKEND_URL = "https://examiaa.onrender.com"; // <-- keep your real backend

// year footer
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ===== MENU (3-lines) =====
const hamburger = document.getElementById("hamburger");
const hamMenu = document.getElementById("hamMenu");

if (hamburger && hamMenu) {
  hamburger.addEventListener("click", () => hamMenu.classList.toggle("open"));
  document.addEventListener("click", (e) => {
    if (!hamMenu.contains(e.target) && !hamburger.contains(e.target)) {
      hamMenu.classList.remove("open");
    }
  });
}

// logout
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await window.EXAMIA_AUTH.logout();
    window.location.href = "login.html";
  });
}

// ===== ELEMENTS =====
const subjectSel = document.getElementById("subjectSel");
const yearSel = document.getElementById("yearSel");
const modeSel = document.getElementById("modeSel");
const bucketSel = document.getElementById("bucketSel");

const filterMsg = document.getElementById("filterMsg");
const refreshBtn = document.getElementById("refreshBtn");
const qMeta = document.getElementById("qMeta");
const qList = document.getElementById("qList");

// ===== HELPERS =====
function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ===== API =====
// NOTE: Your backend must support these endpoints:
// GET  /buckets?subject=&year=&mode=      -> returns ["Kinematics","NLM",...]
// GET  /questions?subject=&year=&mode=&bucket= -> returns [{id, question, solution, solution_image}, ...]

async function apiGetBuckets({ subject, year, mode }) {
  const url =
    `${BACKEND_URL}/buckets?subject=${encodeURIComponent(subject)}` +
    `&year=${encodeURIComponent(year)}` +
    `&mode=${encodeURIComponent(mode)}`;

  const res = await fetch(url);
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

// ===== RENDER =====
async function loadBuckets() {
  filterMsg.textContent = "Loading chapters/papers...";

  const subject = subjectSel.value;
  const year = yearSel.value;
  const mode = modeSel.value;

  try {
    const data = await apiGetBuckets({ subject, year, mode });

    const list = Array.isArray(data) ? data : (data?.buckets || []);
    if (!Array.isArray(list) || list.length === 0) {
      bucketSel.innerHTML = `<option value="">No chapters/papers yet</option>`;
      filterMsg.textContent = "No chapters/papers found. Add from Admin.";
      qList.innerHTML = "";
      qMeta.textContent = "";
      return;
    }

    bucketSel.innerHTML =
      `<option value="">Select...</option>` +
      list.map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join("");

    filterMsg.textContent = "Select Chapter/Paper to load questions.";
  } catch (e) {
    bucketSel.innerHTML = `<option value="">Error</option>`;
    filterMsg.textContent = "❌ Failed to load chapters/papers (backend issue).";
  }
}

async function loadQuestions() {
  const subject = subjectSel.value;
  const year = yearSel.value;
  const mode = modeSel.value;
  const bucket = bucketSel.value;

  if (!bucket) {
    qList.innerHTML = `<p class="muted">Pick a chapter/paper first.</p>`;
    qMeta.textContent = `Subject: ${subject} • Year: ${year}`;
    return;
  }

  qMeta.textContent = `Subject: ${subject} • Year: ${year} • Mode: ${mode} • Bucket: ${bucket}`;
  qList.innerHTML = `<p class="muted">Loading questions...</p>`;

  try {
    const data = await apiGetQuestions({ subject, year, mode, bucket });
    const arr = Array.isArray(data) ? data : (data?.questions || []);

    if (!Array.isArray(arr) || arr.length === 0) {
      qList.innerHTML = `<p class="muted">No questions found for this chapter/paper.</p>`;
      return;
    }

    qList.innerHTML = arr.map((it, idx) => {
      const img = (it.solution_image || "").trim();
      const sol = (it.solution || "").trim();

      return `
        <div class="qCard">
          <p class="qTitle">Q${idx + 1}</p>
          <p class="qText">${escapeHtml(it.question)}</p>

          ${img ? `
            <img
              class="solImg"
              src="${img}"
              alt="Solution"
              loading="lazy"
            />
            <p class="muted" style="margin-top:6px;">Tap image to expand</p>
          ` : ``}

          ${(!img && sol) ? `
            <div class="solText">
              <p class="muted" style="margin:8px 0 0;">Solution:</p>
              <p>${escapeHtml(sol)}</p>
            </div>
          ` : ``}
        </div>
      `;
    }).join("");

  } catch (e) {
    qList.innerHTML = `<p class="muted">❌ Failed to load questions (backend issue).</p>`;
  }
}

// click image -> expand full width
document.addEventListener("click", (e) => {
  const img = e.target.closest(".solImg");
  if (!img) return;
  img.classList.toggle("solImgBig");
});

// ===== EVENTS =====
[subjectSel, yearSel, modeSel].forEach((el) => {
  el.addEventListener("change", async () => {
    await loadBuckets();
    await loadQuestions();
  });
});

bucketSel.addEventListener("change", loadQuestions);

refreshBtn.addEventListener("click", async () => {
  await loadBuckets();
  await loadQuestions();
});

// ===== INIT =====
(async () => {
  await loadBuckets();
  await loadQuestions();
})();
