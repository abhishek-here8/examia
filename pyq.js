const BACKEND_URL = "https://examiaa.onrender.com";

// IDs MUST exist in pyq.html:
const subjectSel = document.getElementById("subjectSel");
const yearSel = document.getElementById("yearSel");
const modeSel = document.getElementById("modeSel");
const bucketSel = document.getElementById("bucketSel");

const refreshBtn = document.getElementById("refreshBtn");
const uiMsg = document.getElementById("uiMsg");
const metaBox = document.getElementById("metaBox");
const questionsBox = document.getElementById("questionsBox");

function setMsg(t) { if (uiMsg) uiMsg.textContent = t; }
function setMeta(t) { if (metaBox) metaBox.textContent = t; }

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// IMPORTANT: match Admin saving format (lowercase)
function getFilters() {
  return {
    subject: (subjectSel?.value || "").toLowerCase(), // physics/chemistry/maths
    year: String(yearSel?.value || ""),
    mode: String(modeSel?.value || ""), // chapters/papers
  };
}

async function safeFetchJson(url) {
  const res = await fetch(url);
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} :: ${text}`);
  try { return JSON.parse(text); } catch { return []; }
}

// ✅ This is the ONLY API we use
async function apiGetAllQuestions({ subject, year, mode }) {
  const url =
    `${BACKEND_URL}/questions?subject=${encodeURIComponent(subject)}` +
    `&year=${encodeURIComponent(year)}` +
    `&mode=${encodeURIComponent(mode)}`;

  const data = await safeFetchJson(url);
  return Array.isArray(data) ? data : (data?.data || []);
}

async function apiGetQuestionsByBucket({ subject, year, mode, bucket }) {
  const url =
    `${BACKEND_URL}/questions?subject=${encodeURIComponent(subject)}` +
    `&year=${encodeURIComponent(year)}` +
    `&mode=${encodeURIComponent(mode)}` +
    `&bucket=${encodeURIComponent(bucket)}`;

  const data = await safeFetchJson(url);
  return Array.isArray(data) ? data : (data?.data || []);
}

function renderBuckets(list) {
  const label = modeSel.value === "papers" ? "Select Paper" : "Select Chapter";
  bucketSel.innerHTML =
    `<option value="">${label}</option>` +
    list.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join("");
}

function renderQuestions(list) {
  if (!Array.isArray(list) || list.length === 0) {
    questionsBox.innerHTML = `<p class="muted">No questions found for this selection.</p>`;
    return;
  }

  questionsBox.innerHTML = list.map((it, i) => {
    const q = escapeHtml(it.question || "");
    const sol = (it.solution || "").trim();
    const img = (it.solution_image || "").trim();

    return `
      <div class="qCard">
        <div class="qTitle">Q${i + 1}</div>
        <div class="qText">${q}</div>

        ${img ? `
          <img class="solImg"
               src="${img}"
               alt="Solution"
               style="max-width:260px;width:100%;border-radius:12px;margin-top:10px;cursor:zoom-in;" />
          <div class="muted" style="margin-top:6px;">Click image to view full width</div>
        ` : sol ? `
          <div class="solText" style="margin-top:10px;">
            <span class="muted">Solution:</span> ${escapeHtml(sol)}
          </div>
        ` : `
          <div class="muted" style="margin-top:10px;">Solution not added yet.</div>
        `}
      </div>
    `;
  }).join("");

  // click image => fullscreen
  document.querySelectorAll(".solImg").forEach(img => {
    img.addEventListener("click", () => openViewer(img.src));
  });
}

// fullscreen viewer
function ensureViewer() {
  if (document.getElementById("imgViewer")) return;
  const div = document.createElement("div");
  div.id = "imgViewer";
  div.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,.75);
    display:none; align-items:center; justify-content:center;
    z-index:9999; padding:12px;
  `;
  div.innerHTML = `<img id="imgViewerImg" style="width:100%;max-width:100%;height:auto;border-radius:12px;" />`;
  div.addEventListener("click", () => {
    div.style.display = "none";
    document.getElementById("imgViewerImg").src = "";
  });
  document.body.appendChild(div);
}
function openViewer(src) {
  ensureViewer();
  document.getElementById("imgViewerImg").src = src;
  document.getElementById("imgViewer").style.display = "flex";
}

async function loadBuckets() {
  const f = getFilters();

  setMeta(`Subject: ${f.subject} • Year: ${f.year} • Mode: ${f.mode}`);
  setMsg("Loading chapters/papers...");
  bucketSel.innerHTML = `<option value="">Loading...</option>`;
  questionsBox.innerHTML = `<p class="muted">Pick a chapter/paper first.</p>`;

  try {
    const all = await apiGetAllQuestions(f);

    // extract unique bucket names
    const buckets = [...new Set(all.map(x => (x.bucket || "").trim()).filter(Boolean))].sort();

    if (buckets.length === 0) {
      renderBuckets([]);
      setMsg("No chapters/papers found. (Check subject/year/mode in your data)");
      bucketSel.innerHTML = `<option value="">No chapters/papers found</option>`;
      return;
    }

    renderBuckets(buckets);
    setMsg(`Loaded ${buckets.length} ✅ Now pick one.`);
  } catch (e) {
    console.error(e);
    setMsg("❌ Failed to load chapters/papers. Backend /questions filter mismatch.");
    bucketSel.innerHTML = `<option value="">Error</option>`;
  }
}

async function loadQuestions() {
  const f = getFilters();
  const bucket = (bucketSel.value || "").trim();

  if (!bucket) {
    questionsBox.innerHTML = `<p class="muted">Pick a chapter/paper first.</p>`;
    return;
  }

  setMsg("Loading questions...");
  questionsBox.innerHTML = `<p class="muted">Loading...</p>`;

  try {
    const list = await apiGetQuestionsByBucket({ ...f, bucket });
    renderQuestions(list);
    setMsg(`Loaded ${list.length} question(s) ✅`);
  } catch (e) {
    console.error(e);
    setMsg("❌ Questions failed to load.");
    questionsBox.innerHTML = `<p class="muted">Could not load questions.</p>`;
  }
}

// events
subjectSel.addEventListener("change", loadBuckets);
yearSel.addEventListener("change", loadBuckets);
modeSel.addEventListener("change", loadBuckets);
bucketSel.addEventListener("change", loadQuestions);
refreshBtn?.addEventListener("click", loadBuckets);

// init
loadBuckets();
