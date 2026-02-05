// ===== EXAMIA PYQ (Stable + Works with your DB) =====
const BACKEND_URL = "https://examiaa.onrender.com"; // <-- your backend url

const subjectSel = document.getElementById("subjectSel");
const yearSel = document.getElementById("yearSel");
const modeSel = document.getElementById("modeSel");
const bucketSel = document.getElementById("bucketSel");
const refreshBtn = document.getElementById("refreshBtn");

const uiMsg = document.getElementById("uiMsg");
const metaBox = document.getElementById("metaBox");
const questionsBox = document.getElementById("questionsBox");

function setMsg(t) {
  if (uiMsg) uiMsg.textContent = t;
}
function setMeta(t) {
  if (metaBox) metaBox.textContent = t;
}
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFilters() {
  return {
    subject: (subjectSel?.value || "").toLowerCase(), // IMPORTANT
    year: String(yearSel?.value || ""),
    mode: String(modeSel?.value || ""), // chapters/papers
  };
}

async function safeFetchJson(url) {
  const res = await fetch(url);
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} :: ${text}`);
  try {
    return JSON.parse(text);
  } catch {
    // if backend returns plain text
    return text;
  }
}

async function apiGetBuckets({ subject, year, mode }) {
  // Your backend MUST support at least ONE of these.
  const urls = [
    `${BACKEND_URL}/buckets?subject=${encodeURIComponent(subject)}&year=${encodeURIComponent(year)}&mode=${encodeURIComponent(mode)}`,
    `${BACKEND_URL}/chapters?subject=${encodeURIComponent(subject)}&year=${encodeURIComponent(year)}&mode=${encodeURIComponent(mode)}`,
    `${BACKEND_URL}/papers?subject=${encodeURIComponent(subject)}&year=${encodeURIComponent(year)}&mode=${encodeURIComponent(mode)}`,
  ];

  let last = null;
  for (const url of urls) {
    try {
      const data = await safeFetchJson(url);
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.buckets)) return data.buckets;
      if (data && Array.isArray(data.data)) return data.data;
      last = new Error("Bad bucket response");
    } catch (e) {
      last = e;
    }
  }
  throw last || new Error("No bucket endpoint works");
}

async function apiGetQuestions({ subject, year, mode, bucket }) {
  const url =
    `${BACKEND_URL}/questions?subject=${encodeURIComponent(subject)}` +
    `&year=${encodeURIComponent(year)}` +
    `&mode=${encodeURIComponent(mode)}` +
    `&bucket=${encodeURIComponent(bucket)}`;

  const data = await safeFetchJson(url);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

function renderBuckets(buckets) {
  const label = modeSel.value === "papers" ? "Select Paper" : "Select Chapter";
  bucketSel.innerHTML =
    `<option value="">${label}</option>` +
    buckets.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join("");
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
          <img class="solImg" src="${img}" alt="Solution image"
               style="max-width:320px;width:100%;border-radius:12px;margin-top:10px;cursor:zoom-in;" />
          <div class="muted" style="margin-top:6px;">Click image to view full width.</div>
        ` : sol ? `
          <div class="solText"><span class="muted">Solution:</span> ${escapeHtml(sol)}</div>
        ` : `
          <div class="muted">Solution not added yet.</div>
        `}
      </div>
    `;
  }).join("");

  // click-to-fullscreen image viewer
  document.querySelectorAll(".solImg").forEach(img => {
    img.addEventListener("click", () => openViewer(img.src));
  });
}

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
    const buckets = await apiGetBuckets(f);
    renderBuckets(buckets);
    setMsg(`Loaded ${buckets.length} ✅`);
  } catch (e) {
    console.error(e);
    setMsg("❌ Buckets not loading. Your backend must provide /buckets OR /chapters OR /papers.");
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
    const list = await apiGetQuestions({ ...f, bucket });
    renderQuestions(list);
    setMsg(`Loaded ${list.length} question(s) ✅`);
  } catch (e) {
    console.error(e);
    setMsg("❌ Questions failed to load.");
    questionsBox.innerHTML = `<p class="muted">Could not load questions.</p>`;
  }
}

subjectSel.addEventListener("change", loadBuckets);
yearSel.addEventListener("change", loadBuckets);
modeSel.addEventListener("change", loadBuckets);

bucketSel.addEventListener("change", loadQuestions);
refreshBtn?.addEventListener("click", loadBuckets);

loadBuckets();
