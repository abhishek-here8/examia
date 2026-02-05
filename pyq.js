const BACKEND_URL = "https://examiaa.onrender.com"; // your backend

// ---------- helpers ----------
function $(id) { return document.getElementById(id); }
function pickId(ids) {
  for (const id of ids) {
    const el = $(id);
    if (el) return el;
  }
  return null;
}
function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function subjectForDB(v) {
  const map = { physics: "Physics", chemistry: "Chemistry", maths: "Maths" };
  return map[v] || v;
}
async function fetchJson(url, opts = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000); // 15s timeout
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); }
    catch {
      throw new Error(`Backend returned non-JSON. Status=${res.status}. First 120 chars: ${text.slice(0,120)}`);
    }
    if (!res.ok) {
      throw new Error(json?.message || json?.error || `Request failed (status ${res.status})`);
    }
    return json;
  } finally {
    clearTimeout(t);
  }
}

// ---------- find elements (works with old/new ids) ----------
const yearEl = pickId(["year"]);
if (yearEl) yearEl.textContent = new Date().getFullYear();

const subjectSel = pickId(["subjectSel", "subject"]);
const yearSel    = pickId(["yearSel", "year"]);
const modeSel    = pickId(["modeSel", "mode"]);
const bucketSel  = pickId(["bucketSel", "bucket", "chapterSel", "paperSel"]);

const filterMsg  = pickId(["filterMsg", "msg", "statusMsg"]);
const refreshBtn = pickId(["refreshBtn", "refresh"]);

const qMeta = pickId(["qMeta", "meta", "questionsMeta"]);
const qList = pickId(["qList", "questions", "questionList"]);

function setMsg(text) {
  if (filterMsg) filterMsg.textContent = text;
  // also log to console so we can see exact reason
  console.log("[PYQ]", text);
}

function ensureBasicsOrShowError() {
  const missing = [];
  if (!subjectSel) missing.push("subject select");
  if (!yearSel) missing.push("year select");
  if (!modeSel) missing.push("mode select");
  if (!bucketSel) missing.push("chapter/paper select");
  if (missing.length) {
    setMsg("❌ Page HTML IDs not matching. Missing: " + missing.join(", "));
    if (qList) qList.innerHTML = `<p class="muted">Fix missing elements: ${escapeHtml(missing.join(", "))}</p>`;
    return false;
  }
  return true;
}

// ---------- API ----------
async function apiGetQuestions({ subject, year, mode, bucket }) {
  let url =
    `${BACKEND_URL}/questions?subject=${encodeURIComponent(subject)}` +
    `&year=${encodeURIComponent(year)}` +
    `&mode=${encodeURIComponent(mode)}`;

  if (bucket) url += `&bucket=${encodeURIComponent(bucket)}`;

  return await fetchJson(url);
}

// ---------- buckets ----------
async function loadBuckets() {
  if (!ensureBasicsOrShowError()) return;

  // show loading inside dropdown
  bucketSel.innerHTML = `<option value="">Loading...</option>`;
  setMsg("Loading chapters/papers...");

  const subject = subjectForDB(subjectSel.value);
  const year = yearSel.value;
  const mode = modeSel.value;

  try {
    // call WITHOUT bucket and extract unique buckets
    const data = await apiGetQuestions({ subject, year, mode });

    const arr = Array.isArray(data) ? data : (data?.questions || []);
    const buckets = [...new Set(arr.map(q => (q.bucket || "").trim()).filter(Boolean))].sort();

    if (!buckets.length) {
      bucketSel.innerHTML = `<option value="">No chapters/papers found</option>`;
      setMsg("No chapters/papers found. Add from Admin.");
      return;
    }

    bucketSel.innerHTML =
      `<option value="">Select...</option>` +
      buckets.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join("");

    setMsg("Select Chapter/Paper to load questions.");
  } catch (e) {
    bucketSel.innerHTML = `<option value="">Error</option>`;
    setMsg("❌ Buckets load failed: " + (e?.message || e));
  }
}

// ---------- questions ----------
async function loadQuestions() {
  if (!ensureBasicsOrShowError()) return;

  const subject = subjectForDB(subjectSel.value);
  const year = yearSel.value;
  const mode = modeSel.value;
  const bucket = bucketSel.value;

  if (qMeta) qMeta.textContent = `Subject: ${subject} • Year: ${year} • Mode: ${mode}`;

  if (!bucket) {
    if (qList) qList.innerHTML = `<p class="muted">Pick a chapter/paper first.</p>`;
    return;
  }

  if (qList) qList.innerHTML = `<p class="muted">Loading questions...</p>`;

  try {
    const data = await apiGetQuestions({ subject, year, mode, bucket });
    const arr = Array.isArray(data) ? data : (data?.questions || []);

    if (!arr.length) {
      if (qList) qList.innerHTML = `<p class="muted">No questions found for "${escapeHtml(bucket)}".</p>`;
      return;
    }

    if (qList) {
      qList.innerHTML = arr.map((it, idx) => {
        const img = (it.solution_image || "").trim();
        const sol = (it.solution || "").trim();
        return `
          <div class="qCard">
            <p class="qTitle">Q${idx + 1}</p>
            <p class="qText">${escapeHtml(it.question)}</p>

            ${img ? `<img class="solImg" src="${img}" alt="Solution" loading="lazy" />` : ""}

            ${(!img && sol) ? `
              <div class="solText">
                <p class="muted" style="margin:8px 0 0;">Solution:</p>
                <p>${escapeHtml(sol)}</p>
              </div>
            ` : ""}
          </div>
        `;
      }).join("");
    }

    if (qMeta) qMeta.textContent =
      `Subject: ${subject} • Year: ${year} • Mode: ${mode} • Bucket: ${bucket} • Q: ${arr.length}`;
  } catch (e) {
    if (qList) qList.innerHTML = `<p class="muted">❌ Questions load failed: ${escapeHtml(e?.message || e)}</p>`;
    setMsg("❌ Questions load failed: " + (e?.message || e));
  }
}

// image click = big
document.addEventListener("click", (e) => {
  const img = e.target.closest(".solImg");
  if (!img) return;
  img.classList.toggle("solImgBig");
});

// ---------- events ----------
function hookEvents() {
  if (!ensureBasicsOrShowError()) return;

  [subjectSel, yearSel, modeSel].forEach((el) => {
    el.addEventListener("change", async () => {
      await loadBuckets();
      await loadQuestions();
    });
  });

  bucketSel.addEventListener("change", loadQuestions);

  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      await loadBuckets();
      await loadQuestions();
    });
  }
}

// ---------- init ----------
(async () => {
  hookEvents();
  await loadBuckets();
  await loadQuestions();
})();
