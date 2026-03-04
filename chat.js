const BACKEND_URL = "https://examiaa.onrender.com"; // your backend

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

window.EXAMIA_AUTH?.setupMenu?.();

const chatBox = document.getElementById("chatBox");
const qEl = document.getElementById("question");
const subjectEl = document.getElementById("subject");
const sendBtn = document.getElementById("sendBtn");
const msgEl = document.getElementById("msg");

function addMsg(role, text) {
  const wrap = document.createElement("div");
  wrap.className = role === "user" ? "chatMsg user" : "chatMsg bot";
  wrap.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>`;
  chatBox.appendChild(wrap);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function askBackend(question, subject) {
  // optional: ensure logged in (recommended)
  await window.EXAMIA_AUTH.requireLogin();
  const session = await window.EXAMIA_AUTH.getSession();
  const accessToken = session?.access_token || "";

  const res = await fetch(`${BACKEND_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ question, subject }),
  });

  return await res.json();
}

sendBtn.addEventListener("click", async () => {
  const question = (qEl.value || "").trim();
  const subject = subjectEl.value;

  if (!question) return;

  addMsg("user", question);
  qEl.value = "";
  msgEl.textContent = "Thinking...";

  try {
    const out = await askBackend(question, subject);
    if (!out?.success) throw new Error(out?.error || "Chat failed");

    addMsg("bot", out.answer);
    if (out.suggestions?.length) {
      addMsg("bot", "Suggestions:\n• " + out.suggestions.join("\n• "));
    }
    msgEl.textContent = "";
  } catch (e) {
    msgEl.textContent = "❌ " + (e.message || e);
  }
});

qEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendBtn.click();
});
