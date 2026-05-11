const socket = io();
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return r.json();


document.getElementById("signupBtn").onclick = async () => {
  const username = usernameEl.value;
  const password = passwordEl.value;
  const r = await post("/signup", { username, password });
  alert(r.ok ? "Created" : r.msg);
};

document.getElementById("loginBtn").onclick = async () => {
  const username = usernameEl.value;
  const password = passwordEl.value;
  const r = await post("/login", { username, password });
  if (!r.ok) return alert(r.msg);

  me = r.username;
  auth.classList.add("hidden");
  app.classList.remove("hidden");
  socket.emit("join", me);
  loadUsers();
};

const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");
const auth = document.getElementById("auth");
const app = document.getElementById("app");

async function loadUsers() {
  const users = await fetch("/users").then(r => r.json());
  const box = document.getElementById("users");
  box.innerHTML = "";

  users.forEach(u => {
    const div = document.createElement("div");
    div.className = "user";
    div.innerText = u.username;
    div.onclick = () => openChat(u.username);
    box.appendChild(div);
  });
}

async function openChat(user) {
  selected = user;
  chatTitle.innerText = user;
  const msgs = await fetch(`/messages/${user}`).then(r => r.json());
  messages.innerHTML = "";
  msgs.forEach(renderMessage);
}

sendBtn.onclick = () => {
  if (!selected || !msg.value) return;
  const payload = { from: me, to: selected, text: msg.value };
  socket.emit("message", payload);
  renderMessage(payload);
  msg.value = "";
};

socket.on("message", data => {
  if (data.from === selected) renderMessage(data);
});

function renderMessage(m) {
  const div = document.createElement("div");
  div.className = m.from === me ? "bubble me" : "bubble";
  div.textContent = m.text;
  messages.appendChild(div);
}