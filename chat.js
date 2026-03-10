console.log("NEW CHAT JS LOADED");
alert("NEW CHAT JS LOADED");

const API = "https://examiaa.onrender.com/chat";

const chatBox = document.getElementById("chatBox");
const questionEl = document.getElementById("question");
const sendBtn = document.getElementById("sendBtn");
const clearChatBtn = document.getElementById("clearChatBtn");
const subjectEl = document.getElementById("chatSubject");
const chatStatus = document.getElementById("chatStatus");

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function addMessage(role, text) {
  const row = document.createElement("div");
  row.className = `chatRow ${role}`;

  const bubble = document.createElement("div");
  bubble.className = `chatBubble ${role === "user" ? "userBubble" : "aiBubble"}`;
  bubble.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");

  row.appendChild(bubble);
  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function setStatus(text) {
  if (chatStatus) chatStatus.textContent = text;
}

async function askAI() {
  const q = (questionEl?.value || "").trim();
  const subject = subjectEl?.value || "general";

  if (!q) {
    setStatus("Type a question first ❌");
    return;
  }

  addMessage("user", q);
  questionEl.value = "";
  setStatus("Thinking...");

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question: q,
        subject: subject
      })
    });

    const data = await res.json();
    console.log("CHAT RESPONSE =", data);

    if (!data.success) {
      addMessage("ai", "Error: " + (data.error || "Something went wrong"));
      setStatus("Failed ❌");
      return;
    }

    addMessage("ai", data.answer || "No answer generated.");
    setStatus("Answered ✅");
  } catch (e) {
    console.log("CHAT FETCH ERROR =", e);
    addMessage("ai", "Error: " + (e.message || e));
    setStatus("Failed ❌");
  }
}

if (sendBtn) sendBtn.addEventListener("click", askAI);

if (questionEl) {
  questionEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askAI();
    }
  });
}

if (clearChatBtn) {
  clearChatBtn.addEventListener("click", () => {
    chatBox.innerHTML = `
      <div class="chatRow ai">
        <div class="chatBubble aiBubble">
          Hello 👋 I am your EXAMIA AI Tutor.
        </div>
      </div>
    `;
    setStatus("Chat cleared ✅");
  });
}
