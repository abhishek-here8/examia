// ===== EXAMIA PYQ (Working Version) =====

const BACKEND_URL = "https://examiaa.onrender.com"; // <-- keep your correct backend url here

// --- Grab elements ---
const subjectSel = document.getElementById("subjectSel");
const yearSel = document.getElementById("yearSel");
const modeSel = document.getElementById("modeSel");
const bucketSel = document.getElementById("bucketSel");
const refreshBtn = document.getElementById("refreshBtn");

const uiMsg = document.getElementById("uiMsg");         // optional (if exists)
const questionsBox = document.getElementById("questionsBox"); // must exist
const metaBox = document.getElementById("metaBox");     // optional (if exists)

// --- helpers ---
function setMsg(text, type = "muted") {
  if (!uiMsg) return;
  uiMsg.className = type; // you may already style .muted .error etc
  uiMsg.textContent = text;
}

function setMeta(text) {
  if (!metaBox) return;
  metaBox.textContent = text;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// IMPORTANT FIX:
// Your admin saves subject as: physics / chemistry / maths (lowercase)
// So PYQ must send EXACTLY that.
function subjectForDB(v) {
  return (v || "").toLowerCase();
}

// Your admin saves mode as: chapters / papers
function modeForDB(v) {
  return v; // already should be "chapters" or "papers"
}

function getFilters() {
  return {
    subject: subjectForDB(subjectSel?.value),
    year: String(yearSel?.value || ""),
    mode: modeForDB(modeSel?.value),
  };
}

// --- API calls ---
async function safeFetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} :: ${t}`.trim());
  }
  return await res.json();
}

// Try multiple endpoints to get bucket list (chapters/papers)
async function apiGetBuckets({ subject, year, mode }) {
  const tries = [];

  // Most likely endpoint in your backend:
  tries.push(`${BACKEND_URL}/buckets?subject=${encodeURIComponent(subject)}&year=${encodeURIComponent(year)}&mode=${encodeURIComponent(mode)}`);

  // Common alternatives:
  if (mode === "chapters") {
    tries.push(`${BACKEND_URL}/chapters?subject=${encodeURIComponent(subject)}&year=${encodeURIComponent(year)}`);
    tries.push(`${BACKEND_URL}/chapters?subject=${encodeURIComponent(subject)}&year=${encodeURIComponent(year)}&mode=${encodeURIComponent(mode)}`);
  } else {
    tries.push(`${BACKEND_URL}/papers?subject=${encodeURIComponent(subject)}&year=${encodeURIComponent(year)}`);
    tries.push(`${BACKEND_URL}/papers?subject=${encodeURIComponent(subject)}&year=${encodeURIComponent(year)}&mode=${encodeURIComponent(mode)}`);
  }

  // last fallback:
  tries.push(`${BACKEND_URL}/list-buckets?subject=${encodeURIComponent(subject)}&year=${encodeURIComponent(year)}&mode=${encodeURIComponent(mode)}`);

  let lastErr = null;

  for (const url of tries) {
    try {
      const data = await safeFetchJson(url);

      // accept formats: ["Kinematics", ...] OR { buckets: [...] }
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.buckets)) return data.buckets;
      if (data && Array.isArray(data.data)) return data.data;

      // if server returns something else, ignore and try next
      lastErr = new Error(`Unexpected bucket response from ${url}`);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("Failed to load buckets");
}

async function apiGetQuestions({ subject, year, mode, bucket }) {
  const url =
    `${BACKEND_URL}/questions?subject=${encodeURIComponent(subject)}` +
    `&year=${encodeURIComponent(year)}` +
    `&mode=${encodeURIComponent(mode)}` +
    `&bucket=${encodeURIComponent(bucket)}`;

  const data = await safeFetchJson(url);

  // accept formats: [{...}] OR { data: [...] }
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;

  return [];
}

// --- UI render ---
function renderBuckets(buckets) {
  if (!bucketSel) return;

  const label = (modeSel?.value === "papers") ? "Select Paper" : "Select Chapter";

  const options = [
    `<option value="">${label}</option>`,
    ...buckets.map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`),
  ];

  bucketSel.innerHTML = options.join("");
}

function renderQuestions(list) {
  if (!questionsBox) return;

  if (!Array.isArray(list) || list.length === 0) {
    questionsBox.innerHTML = `<p class="muted">No questions found for this selection.</p>`;
    return;
  }

  questionsBox.innerHTML = list
    .map((it, idx) => {
      const q = escapeHtml(it.question || "");
      const solText = (it.solution || "").trim();
      const solImg = (it.solution_image || "").trim();

      return `
        <div class="qCard">
          <div class="qTitle">Q${idx + 1}</div>
          <div class="qText">${q}</div>

          ${
            solImg
              ? `
                <div class="solWrap">
                  <img class="solImg" src="${solImg}" alt="Solution image" />
                  <div class="muted" style="margin-top:6px;">Click image to view full width.</div>
                </div>
              `
              : solText
              ? `<div class="solText"><span class="muted">Solution:</span> ${escapeHtml(solText)}</div>`
              : `<div class="muted">Solution not added yet.</div>`
          }
        </div>
      `;
    })
    .join("");
}

// Full-width image viewer (simple)
function ensureImageViewer() {
  if (document.getElementById("imgViewer")) return;

  const div = document.createElement("div");
  div.id = "imgViewer";
  div.style.cssText = `
    position:fixed; inset:0;
    background:rgba(0,0,0,.75);
    display:none;
    align-items:center;
    justify-content:center;
    z-index:9999;
    padding:12px;
  `;

  div.innerHTML = `
    <div style="max-width:100%; width:100%; display:flex; justify-content:center;">
      <img id="imgViewerImg" src="" alt="Solution" style="max-width:100%; width:100%; height:auto; border-radius:12px;" />
    </div>
  `;

  div.addEventListener("click", () => {
    div.style.display = "none";
    document.getElementById("imgViewerImg").src = "";
  });

  document.body.appendChild(div);
}

// --- main flow ---
async function loadBucketsAndResetQuestions() {
  const f = getFilters();

  // basic validation
  if (!f.subject || !f.year || !f.mode) {
    setMsg("Select subject, year and mode first.", "muted");
    if (bucketSel) bucketSel.innerHTML = `<option value="">Select chapter/paper</option>`;
    if (questionsBox) questionsBox.innerHTML = `<p class="muted">Pick a chapter/paper to see questions.</p>`;
    return;
  }

  setMeta(`Subject: ${f.subject} • Year: ${f.year} • Mode: ${f.mode}`);
  setMsg("Loading chapters/papers...", "muted");

  if (bucketSel) {
    bucketSel.innerHTML = `<option value="">Loading...</option>`;
  }

  try {
    const buckets = await apiGetBuckets(f);
    renderBuckets(buckets);

    setMsg(`Loaded ${buckets.length} ${f.mode === "papers" ? "papers" : "chapters"} ✅`, "muted");
    if (questionsBox) questionsBox.innerHTML = `<p class="muted">Now select a chapter/paper.</p>`;
  } catch (e) {
    console.error("Bucket load failed:", e);
    setMsg("❌ Failed to load chapters/papers. Backend endpoint missing or blocked.", "error");
    if (bucketSel) bucketSel.innerHTML = `<option value="">Error</option>`;
    if (questionsBox) questionsBox.innerHTML = `<p class="muted">Could not load chapters/papers.</p>`;
  }
}

async function loadQuestionsForBucket() {
  const f = getFilters();
  const bucket = (bucketSel?.value || "").trim();

  if (!bucket) {
    if (questionsBox) questionsBox.innerHTML = `<p class="muted">Pick a chapter/paper first.</p>`;
    return;
  }

  setMsg("Loading questions...", "muted");
  if (questionsBox) questionsBox.innerHTML = `<p class="muted">Loading...</p>`;

  try {
    const list = await apiGetQuestions({ ...f, bucket });
    renderQuestions(list);
    setMsg(`Loaded ${list.length} question(s) ✅`, "muted");

    // enable click-to-full-width on solution images
    ensureImageViewer();
    document.querySelectorAll(".solImg").forEach((img) => {
      img.style.maxWidth = "320px"; // small default size
      img.style.cursor = "zoom-in";
      img.style.borderRadius = "12px";
      img.style.marginTop = "10px";
      img.addEventListener("click", () => {
        const viewer = document.getElementById("imgViewer");
        const viewerImg = document.getElementById("imgViewerImg");
        viewerImg.src = img.src;
        viewer.style.display = "flex";
      });
    });
  } catch (e) {
    console.error("Question load failed:", e);
    setMsg("❌ Failed to load questions.", "error");
    if (questionsBox) questionsBox.innerHTML = `<p class="muted">Could not load questions.</p>`;
  }
}

// --- events ---
subjectSel?.addEventListener("change", loadBucketsAndResetQuestions);
yearSel?.addEventListener("change", loadBucketsAndResetQuestions);
modeSel?.addEventListener("change", loadBucketsAndResetQuestions);

bucketSel?.addEventListener("change", loadQuestionsForBucket);

refreshBtn?.addEventListener("click", async () => {
  await loadBucketsAndResetQuestions();
});

// init
(function init() {
  setMsg("", "muted");
  loadBucketsAndResetQuestions();
})();// ===== EXAMIA PYQ (Working Version) =====

const BACKEND_URL = "https://examiaa.onrender.com"; // <-- keep your correct backend url here

// --- Grab elements ---
const subjectSel = document.getElementById("subjectSel");
const yearSel = document.getElementById("yearSel");
const modeSel = document.getElementById("modeSel");
const bucketSel = document.getElementById("bucketSel");
const refreshBtn = document.getElementById("refreshBtn");

const uiMsg = document.getElementById("uiMsg");         // optional (if exists)
const questionsBox = document.getElementById("questionsBox"); // must exist
const metaBox = document.getElementById("metaBox");     // optional (if exists)

// --- helpers ---
function setMsg(text, type = "muted") {
  if (!uiMsg) return;
  uiMsg.className = type; // you may already style .muted .error etc
  uiMsg.textContent = text;
}

function setMeta(text) {
  if (!metaBox) return;
  metaBox.textContent = text;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// IMPORTANT FIX:
// Your admin saves subject as: physics / chemistry / maths (lowercase)
// So PYQ must send EXACTLY that.
function subjectForDB(v) {
  return (v || "").toLowerCase();
}

// Your admin saves mode as: chapters / papers
function modeForDB(v) {
  return v; // already should be "chapters" or "papers"
}

function getFilters() {
  return {
    subject: subjectForDB(subjectSel?.value),
    year: String(yearSel?.value || ""),
    mode: modeForDB(modeSel?.value),
  };
}

// --- API calls ---
async function safeFetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} :: ${t}`.trim());
  }
  return await res.json();
}

// Try multiple endpoints to get bucket list (chapters/papers)
async function apiGetBuckets({ subject, year, mode }) {
  const tries = [];

  // Most likely endpoint in your backend:
  tries.push(`${BACKEND_URL}/buckets?subject=${encodeURIComponent(subject)}&year=${encodeURIComponent(year)}&mode=${encodeURIComponent(mode)}`);

  // Common alternatives:
  if (mode === "chapters") {
    tries.push(`${BACKEND_URL}/chapters?subject=${encodeURIComponent(subject)}&year=${encodeURIComponent(year)}`);
    tries.push(`${BACKEND_URL}/chapters?subject=${encodeURIComponent(subject)}&year=${encodeURIComponent(year)}&mode=${encodeURIComponent(mode)}`);
  } else {
    tries.push(`${BACKEND_URL}/papers?subject=${encodeURIComponent(subject)}&year=${encodeURIComponent(year)}`);
    tries.push(`${BACKEND_URL}/papers?subject=${encodeURIComponent(subject)}&year=${encodeURIComponent(year)}&mode=${encodeURIComponent(mode)}`);
  }

  // last fallback:
  tries.push(`${BACKEND_URL}/list-buckets?subject=${encodeURIComponent(subject)}&year=${encodeURIComponent(year)}&mode=${encodeURIComponent(mode)}`);

  let lastErr = null;

  for (const url of tries) {
    try {
      const data = await safeFetchJson(url);

      // accept formats: ["Kinematics", ...] OR { buckets: [...] }
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.buckets)) return data.buckets;
      if (data && Array.isArray(data.data)) return data.data;

      // if server returns something else, ignore and try next
      lastErr = new Error(`Unexpected bucket response from ${url}`);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("Failed to load buckets");
}

async function apiGetQuestions({ subject, year, mode, bucket }) {
  const url =
    `${BACKEND_URL}/questions?subject=${encodeURIComponent(subject)}` +
    `&year=${encodeURIComponent(year)}` +
    `&mode=${encodeURIComponent(mode)}` +
    `&bucket=${encodeURIComponent(bucket)}`;

  const data = await safeFetchJson(url);

  // accept formats: [{...}] OR { data: [...] }
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;

  return [];
}

// --- UI render ---
function renderBuckets(buckets) {
  if (!bucketSel) return;

  const label = (modeSel?.value === "papers") ? "Select Paper" : "Select Chapter";

  const options = [
    `<option value="">${label}</option>`,
    ...buckets.map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`),
  ];

  bucketSel.innerHTML = options.join("");
}

function renderQuestions(list) {
  if (!questionsBox) return;

  if (!Array.isArray(list) || list.length === 0) {
    questionsBox.innerHTML = `<p class="muted">No questions found for this selection.</p>`;
    return;
  }

  questionsBox.innerHTML = list
    .map((it, idx) => {
      const q = escapeHtml(it.question || "");
      const solText = (it.solution || "").trim();
      const solImg = (it.solution_image || "").trim();

      return `
        <div class="qCard">
          <div class="qTitle">Q${idx + 1}</div>
          <div class="qText">${q}</div>

          ${
            solImg
              ? `
                <div class="solWrap">
                  <img class="solImg" src="${solImg}" alt="Solution image" />
                  <div class="muted" style="margin-top:6px;">Click image to view full width.</div>
                </div>
              `
              : solText
              ? `<div class="solText"><span class="muted">Solution:</span> ${escapeHtml(solText)}</div>`
              : `<div class="muted">Solution not added yet.</div>`
          }
        </div>
      `;
    })
    .join("");
}

// Full-width image viewer (simple)
function ensureImageViewer() {
  if (document.getElementById("imgViewer")) return;

  const div = document.createElement("div");
  div.id = "imgViewer";
  div.style.cssText = `
    position:fixed; inset:0;
    background:rgba(0,0,0,.75);
    display:none;
    align-items:center;
    justify-content:center;
    z-index:9999;
    padding:12px;
  `;

  div.innerHTML = `
    <div style="max-width:100%; width:100%; display:flex; justify-content:center;">
      <img id="imgViewerImg" src="" alt="Solution" style="max-width:100%; width:100%; height:auto; border-radius:12px;" />
    </div>
  `;

  div.addEventListener("click", () => {
    div.style.display = "none";
    document.getElementById("imgViewerImg").src = "";
  });

  document.body.appendChild(div);
}

// --- main flow ---
async function loadBucketsAndResetQuestions() {
  const f = getFilters();

  // basic validation
  if (!f.subject || !f.year || !f.mode) {
    setMsg("Select subject, year and mode first.", "muted");
    if (bucketSel) bucketSel.innerHTML = `<option value="">Select chapter/paper</option>`;
    if (questionsBox) questionsBox.innerHTML = `<p class="muted">Pick a chapter/paper to see questions.</p>`;
    return;
  }

  setMeta(`Subject: ${f.subject} • Year: ${f.year} • Mode: ${f.mode}`);
  setMsg("Loading chapters/papers...", "muted");

  if (bucketSel) {
    bucketSel.innerHTML = `<option value="">Loading...</option>`;
  }

  try {
    const buckets = await apiGetBuckets(f);
    renderBuckets(buckets);

    setMsg(`Loaded ${buckets.length} ${f.mode === "papers" ? "papers" : "chapters"} ✅`, "muted");
    if (questionsBox) questionsBox.innerHTML = `<p class="muted">Now select a chapter/paper.</p>`;
  } catch (e) {
    console.error("Bucket load failed:", e);
    setMsg("❌ Failed to load chapters/papers. Backend endpoint missing or blocked.", "error");
    if (bucketSel) bucketSel.innerHTML = `<option value="">Error</option>`;
    if (questionsBox) questionsBox.innerHTML = `<p class="muted">Could not load chapters/papers.</p>`;
  }
}

async function loadQuestionsForBucket() {
  const f = getFilters();
  const bucket = (bucketSel?.value || "").trim();

  if (!bucket) {
    if (questionsBox) questionsBox.innerHTML = `<p class="muted">Pick a chapter/paper first.</p>`;
    return;
  }

  setMsg("Loading questions...", "muted");
  if (questionsBox) questionsBox.innerHTML = `<p class="muted">Loading...</p>`;

  try {
    const list = await apiGetQuestions({ ...f, bucket });
    renderQuestions(list);
    setMsg(`Loaded ${list.length} question(s) ✅`, "muted");

    // enable click-to-full-width on solution images
    ensureImageViewer();
    document.querySelectorAll(".solImg").forEach((img) => {
      img.style.maxWidth = "320px"; // small default size
      img.style.cursor = "zoom-in";
      img.style.borderRadius = "12px";
      img.style.marginTop = "10px";
      img.addEventListener("click", () => {
        const viewer = document.getElementById("imgViewer");
        const viewerImg = document.getElementById("imgViewerImg");
        viewerImg.src = img.src;
        viewer.style.display = "flex";
      });
    });
  } catch (e) {
    console.error("Question load failed:", e);
    setMsg("❌ Failed to load questions.", "error");
    if (questionsBox) questionsBox.innerHTML = `<p class="muted">Could not load questions.</p>`;
  }
}

// --- events ---
subjectSel?.addEventListener("change", loadBucketsAndResetQuestions);
yearSel?.addEventListener("change", loadBucketsAndResetQuestions);
modeSel?.addEventListener("change", loadBucketsAndResetQuestions);

bucketSel?.addEventListener("change", loadQuestionsForBucket);

refreshBtn?.addEventListener("click", async () => {
  await loadBucketsAndResetQuestions();
});

// init
(function init() {
  setMsg("", "muted");
  loadBucketsAndResetQuestions();
})();
