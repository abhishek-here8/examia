const API_BASE = "https://examia-tkwz.onrender.com";

let currentSubject = "Physics";
let currentExam = "JEE Main";
let currentYear = "2023";
let searchTerm = "";
let allPYQs = [];

async function loadFromAPI() {
  try {
    const res = await fetch(`${API_BASE}/pyqs`);
    const data = await res.json();
    allPYQs = Array.isArray(data) ? data : [];
    render();
  } catch (e) {
    const box = document.getElementById("questions");
    if (box) box.innerHTML = "<p>❌ Could not load PYQs from server.</p>";
  }
}

function render() {
  const box = document.getElementById("questions");
  if (!box) return;

  const term = searchTerm.toLowerCase().trim();

  const filtered = allPYQs.filter(item => {
    const matchMain =
      item.subject === currentSubject &&
      item.exam === currentExam &&
      item.year === currentYear;

    if (!matchMain) return false;

    if (!term) return true;

    const text = `${item.question} ${item.solution}`.toLowerCase();
    return text.includes(term);
  });

  let html = `<h3>${currentSubject} PYQs (${currentExam} ${currentYear})</h3>`;

  if (filtered.length === 0) {
    html += `<p>No questions available yet.</p>`;
    box.innerHTML = html;
    return;
  }

  filtered.forEach((item, idx) => {
    html += `
      <div class="qbox">
        <b>Q${idx + 1}.</b> ${item.question}<br><br>
        <details>
          <summary><b>Show Solution</b></summary>
          <div style="margin-top:8px;"><b>Solution:</b> ${item.solution}</div>
        </details>
      </div>
      <hr>
    `;
  });

  box.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", () => {
  // Subject buttons
  const bp = document.getElementById("btnPhysics");
  const bc = document.getElementById("btnChemistry");
  const bm = document.getElementById("btnMaths");

  if (bp) bp.addEventListener("click", () => { currentSubject = "Physics"; render(); });
  if (bc) bc.addEventListener("click", () => { currentSubject = "Chemistry"; render(); });
  if (bm) bm.addEventListener("click", () => { currentSubject = "Maths"; render(); });

  // Dropdowns
  const examSelect = document.getElementById("examSelect");
  const yearSelect = document.getElementById("yearSelect");

  if (examSelect) examSelect.addEventListener("change", (e) => { currentExam = e.target.value; render(); });
  if (yearSelect) yearSelect.addEventListener("change", (e) => { currentYear = e.target.value; render(); });

  // Search input
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchTerm = e.target.value;
      render();
    });
  }

  loadFromAPI();
});
