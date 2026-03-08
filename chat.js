const API = "https://examiaa.onrender.com/chat";

async function askAI() {

const q = document.getElementById("question").value;

const res = await fetch(API,{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
question:q
})
});

const data = await res.json();

const box = document.getElementById("chatBox");

box.innerHTML += `<p><b>You:</b> ${q}</p>`;
box.innerHTML += `<p><b>AI:</b> ${data.answer}</p>`;

}
