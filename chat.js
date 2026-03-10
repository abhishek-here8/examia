const API = "https://examiaa.onrender.com/chat";

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

window.EXAMIA_AUTH?.setupMenu?.();

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
    console.log("API URL =",API);
    
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

    if (!data.success) {
      addMessage("ai", "Error: " + (data.error || "Something went wrong"));
      setStatus("Failed ❌");
      return;
    }

    addMessage("ai", data.answer || "No answer generated.");

    if (Array.isArray(data.suggestedPYQ) && data.suggestedPYQ.length > 0) {
      let pyqText = "Suggested PYQs:\n";
      data.suggestedPYQ.forEach((item, i) => {
        pyqText += `${i + 1}. ${item.subject || ""} ${item.year || ""} ${item.chapter || item.bucket || ""}\n`;
      });
      addMessage("ai", pyqText);
    }

    setStatus("Answered ✅");
  } catch (e) {
    addMessage("ai", "Error: " + (e.message || e));
    setStatus("Failed ❌");
  }
}

if (sendBtn) {
  sendBtn.addEventListener("click", askAI);
}

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
          Hello 👋 I am your EXAMIA AI Tutor. Ask me any doubt from Physics, Chemistry, or Maths.
        </div>
      </div>
    `;
    setStatus("Chat cleared ✅");
  });
}
