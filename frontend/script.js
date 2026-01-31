/* ================================
   EXAMIA FRONTEND - script.js
   - LOGIN REQUIRED for Home + PYQs + Admin
   - Admin role handled correctly
================================== */

// ✅ Put your Render backend base URL here:
const API_BASE = "https://examia-tkwz.onrender.com";

const storage = {
  getToken: () => localStorage.getItem("examia_token"),
  setToken: (t) => localStorage.setItem("examia_token", t),
  clearToken: () => localStorage.removeItem("examia_token"),

  getRole: () => localStorage.getItem("examia_role"),
  setRole: (r) => localStorage.setItem("examia_role", r),
  clearRole: () => localStorage.removeItem("examia_role"),

  getName: () => localStorage.getItem("examia_name"),
  setName: (n) => localStorage.setItem("examia_name", n),
  clearName: () => localStorage.removeItem("examia_name"),
};

function $(id) { return document.getElementById(id); }
function show(el) { if (el) el.classList.remove("hidden"); }
function hide(el) { if (el) el.classList.add("hidden"); }

function setMsg(el, text, type) {
  if (!el) return;
  el.textContent = text || "";
  el.classList.remove("ok", "bad");
  if (type === "ok") el.classList.add("ok");
  if (type === "bad") el.classList.add("bad");
  if (!text) el.classList.add("hidden");
  else el.classList.remove("hidden");
}

function currentPage() {
  const p = (location.pathname.split("/").pop() || "").toLowerCase();
  return p || "index.html";
}

function isPublicPage(page) {
  return page === "login.html" || page === "signup.html";
}

function redirectToLogin() {
  const page = currentPage();
  const next = encodeURIComponent(page);
  window.location.href = `login.html?next=${next}`;
}

function getNextParam() {
  const params = new URLSearchParams(location.search);
  const nxt = params.get("next");
  return nxt ? decodeURIComponent(nxt) : null;
}

async function api(path, opts = {}) {
  const token = storage.getToken();
  const headers = Object.assign(
    { "Content-Type": "application/json" },
    opts.headers || {}
  );
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function logoutNow() {
  storage.clearToken();
  storage.clearRole();
  storage.clearName();
  // Always go to login because site requires login
  window.location.href = "login.html";
}

/* ================================
   AUTH GUARD: LOGIN REQUIRED
================================== */
function enforceLoginGuard() {
  const page = currentPage();
  const token = storage.getToken();

  // Only login/signup accessible without token
  if (!token && !isPublicPage(page)) {
    redirectToLogin();
    return false;
  }
  return true;
}

/* ================================
   NAV UI
================================== */
function updateNav() {
  const token = storage.getToken();
  const role = storage.getRole();

  const navLogin = $("navLogin");
  const navSignup = $("navSignup");
  const navLogout = $("navLogout");
  const navAdmin = $("navAdmin");

  if (!token) {
    show(navLogin);
    show(navSignup);
    hide(navLogout);
    hide(navAdmin);
  } else {
    hide(navLogin);
    hide(navSignup);
    show(navLogout);
    if (role === "admin") show(navAdmin);
    else hide(navAdmin);
  }
}

/* ================================
   SIGNUP
================================== */
function handleSignupPage() {
  const form = $("signupForm");
  if (!form) return;

  const msg = $("signupMsg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg(msg, "", "");

    const name = $("name").value.trim();
    const email = $("email").value.trim();
    const password = $("password").value.trim();

    if (!name || !email || !password) {
      setMsg(msg, "Please fill all fields.", "bad");
      return;
    }

    try {
      const data = await api("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });

      storage.setToken(data.token);
      storage.setRole(data.role || "user");
      storage.setName(data.name || name);

      setMsg(msg, "Signup successful ✅ Redirecting...", "ok");

      // go next if specified, else pyqs
      const nxt = getNextParam();
      setTimeout(() => {
        window.location.href = nxt ? nxt : "pyqs.html";
      }, 500);

    } catch (err) {
      setMsg(msg, err.message, "bad");
    }
  });
}

/* ================================
   LOGIN
================================== */
function handleLoginPage() {
  const form = $("loginForm");
  if (!form) return;

  const msg = $("loginMsg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg(msg, "", "");

    const email = $("email").value.trim();     // can be admin id too
    const password = $("password").value.trim();

    if (!email || !password) {
      setMsg(msg, "Please enter ID/email and password.", "bad");
      return;
    }

    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      storage.setToken(data.token);
      storage.setRole(data.role || "user");
      storage.setName(data.name || "");

      setMsg(msg, "Login successful ✅ Redirecting...", "ok");

      const nxt = getNextParam();

      setTimeout(() => {
        if (nxt) return (window.location.href = nxt);
        if (data.role === "admin") return (window.location.href = "admin.html");
        return (window.location.href = "pyqs.html");
      }, 500);

    } catch (err) {
      setMsg(msg, err.message, "bad");
    }
  });
}

/* ================================
   PYQS
================================== */
function buildQuery(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v && String(v).trim()) q.set(k, String(v).trim());
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderPYQs(items) {
  const list = $("pyqList");
  if (!list) return;

  if (!items.length) {
    list.innerHTML = `<div class="msg">No PYQs found for selected filters.</div>`;
    return;
  }

  list.innerHTML = items.map((x) => {
    return `
      <div class="pyq">
        <div class="top">
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <span class="pill">${escapeHtml(x.exam)}</span>
            <span class="pill">${escapeHtml(x.year)}</span>
            <span class="pill">${escapeHtml(x.subject)}</span>
            <span class="pill">${escapeHtml(x.chapter)}</span>
            <span class="pill">${escapeHtml(x.type)}</span>
          </div>
        </div>

        <h3>${escapeHtml(x.question)}</h3>

        <details>
          <summary>View solution</summary>
          <div class="sol">${escapeHtml(x.solution)}</div>
        </details>
      </div>
    `;
  }).join("");
}

async function loadPYQs() {
  if (!$("pyqPage")) return;

  const msg = $("pyqMsg");
  const exam = $("fExam")?.value || "";
  const year = $("fYear")?.value || "";
  const subject = $("fSubject")?.value || "";
  const chapter = $("fChapter")?.value || "";
  const type = $("fType")?.value || "";

  try {
    setMsg(msg, "Loading PYQs...", "");
    const data = await api(`/api/pyqs${buildQuery({ exam, year, subject, chapter, type })}`, { method: "GET" });
    setMsg(msg, `Found ${data.count} PYQs`, "ok");
    renderPYQs(data.items || []);
  } catch (err) {
    // If token expired/invalid, force login
    setMsg(msg, err.message, "bad");
    if (err.message.toLowerCase().includes("token")) {
      logoutNow();
    }
  }
}

function handlePYQsPage() {
  if (!$("pyqPage")) return;

  ["fExam", "fYear", "fSubject", "fChapter", "fType"].forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener("change", loadPYQs);
  });

  const btn = $("btnRefresh");
  if (btn) btn.addEventListener("click", loadPYQs);

  loadPYQs();
}

/* ================================
   ADMIN GUARD + ADMIN ADD/DELETE
================================== */
function requireAdminOrRedirect() {
  const token = storage.getToken();
  const role = storage.getRole();

  if (!token) {
    redirectToLogin();
    return false;
  }
  if (role !== "admin") {
    window.location.href = "pyqs.html";
    return false;
  }
  return true;
}

function handleAdminPage() {
  if (!$("adminPage")) return;
  if (!requireAdminOrRedirect()) return;

  const form = $("addPyqForm");
  const msg = $("adminMsg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg(msg, "", "");

    const payload = {
      exam: $("exam").value.trim(),
      year: $("year").value.trim(),
      subject: $("subject").value.trim(),
      chapter: $("chapter").value.trim(),
      type: $("type").value.trim(),
      question: $("question").value.trim(),
      solution: $("solution").value.trim(),
    };

    if (Object.values(payload).some(v => !v)) {
      setMsg(msg, "Please fill all fields.", "bad");
      return;
    }

    try {
      await api("/api/admin/pyqs", { method: "POST", body: JSON.stringify(payload) });
      setMsg(msg, "PYQ added ✅", "ok");
      form.reset();
    } catch (err) {
      setMsg(msg, err.message, "bad");
    }
  });
}

async function loadAdminPYQs() {
  const list = $("adminPyqList");
  if (!list) return;

  const msg = $("adminDelMsg");
  try {
    setMsg(msg, "Loading...", "");
    const data = await api("/api/pyqs", { method: "GET" }); // token required now
    setMsg(msg, `Total: ${data.count}`, "ok");

    if (!data.items.length) {
      list.innerHTML = `<div class="msg">No PYQs available.</div>`;
      return;
    }

    list.innerHTML = data.items.map((x) => {
      return `
        <div class="pyq">
          <div class="top">
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <span class="pill">${escapeHtml(x.exam)}</span>
              <span class="pill">${escapeHtml(x.year)}</span>
              <span class="pill">${escapeHtml(x.subject)}</span>
              <span class="pill">${escapeHtml(x.chapter)}</span>
              <span class="pill">${escapeHtml(x.type)}</span>
            </div>
            <button class="btn sm danger" data-del="${escapeHtml(x.id)}">Delete</button>
          </div>
          <h3>${escapeHtml(x.question)}</h3>
        </div>
      `;
    }).join("");

    list.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-del");
        if (!confirm("Delete this PYQ?")) return;
        try {
          await api(`/api/admin/pyqs/${id}`, { method: "DELETE" });
          setMsg(msg, "Deleted ✅", "ok");
          loadAdminPYQs();
        } catch (err) {
          setMsg(msg, err.message, "bad");
        }
      });
    });

  } catch (err) {
    setMsg(msg, err.message, "bad");
  }
}

function handleAdminDeletePage() {
  if (!$("adminDeletePage")) return;
  if (!requireAdminOrRedirect()) return;
  loadAdminPYQs();
}

/* ================================
   BOOT
================================== */
document.addEventListener("DOMContentLoaded", () => {
  // Enforce login requirement for Home/PYQs/Admin pages
  if (!enforceLoginGuard()) return;

  // Footer year
  const y = $("yearNow");
  if (y) y.textContent = new Date().getFullYear();

  // Logout
  const navLogout = $("navLogout");
  if (navLogout) navLogout.addEventListener("click", logoutNow);

  updateNav();

  handleSignupPage();
  handleLoginPage();
  handlePYQsPage();
  handleAdminPage();
  handleAdminDeletePage();
});
