// ===== CONFIG =====
const BACKEND_URL = "https://examiaa.onrender.com"; // your backend

// Footer year
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ===== MENU =====
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

// ===== HELP
