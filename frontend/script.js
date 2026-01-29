const API_BASE = "https://examia-tkwz.onrender.com";

let currentSubject = "Physics";
let currentExam = "JEE Main";
let currentYear = "2023";
let allPYQs = [];

async function loadFromAPI() {
  const res = await fetch(`${API_BASE}/pyqs`);
  const data = await res.json();
  allPYQs = data;
  render();
}

function render() {
  const box = document.getElementById("questions");

  const filtered = allPYQs.filter(item =>
    item.subject === currentSubject &&
    item.exam === currentExam &&
    item.year === currentYear
  );

  let html = `<h3>${currentSubject} PYQs (${currentExam} ${currentYear})</h3>`;

  if (filtered.length === 0) {
    html += `<p>No questions available yet.</p>`;
    box.innerHTML = html;
    return;
  }

  <details>
  <summary><b>Show Solution</b></summary>
  <div style="margin-top:8px;"><b>Solution:</b> ${item.solution}</div>
</details>


document.addEventListener("DOMContentLoaded", () => {
  // Subject buttons
  document.getElementById("btnPhysics").addEventListener("click", () => { currentSubject = "Physics"; render(); });
  document.getElementById("btnChemistry").addEventListener("click", () => { currentSubject = "Chemistry"; render(); });
  document.getElementById("btnMaths").addEventListener("click", () => { currentSubject = "Maths"; render(); });

  // Dropdowns
  document.getElementById("examSelect").addEventListener("change", (e) => { currentExam = e.target.value; render(); });
  document.getElementById("yearSelect").addEventListener("change", (e) => { currentYear = e.target.value; render(); });

  loadFromAPI();
});
