const socket = io();

let me = "";
let selected = "";

const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");
const auth = document.getElementById("auth");
const app = document.getElementById("app");

const usersBox = document.getElementById("users");
const chatTitle = document.getElementById("chatTitle");
const messages = document.getElementById("messages");
const msg = document.getElementById("msg");
const sendBtn = document.getElementById("sendBtn");

async function post(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return await r.json();
}

document.getElementById("signupBtn").onclick = async () => {
  const username = usernameEl.value.trim();
  const password = passwordEl.value.trim();

  const r = await post("/signup", { username, password });

  if (r.ok) {
    alert("Signup successful");
  } else {
    alert(r.error || "Signup failed");
  }
};

document.getElementById("loginBtn").onclick = async () => {
  const username = usernameEl.value.trim();
  const password = passwordEl.value.trim();

  const r = await post("/login", { username, password });

  if (!r.ok) {
    alert(r.error || "Login failed");
    return;
  }

  me = username;

  auth.classList.add("hidden");
  app.classList.remove("hidden");

  socket.emit("join", me);

  loadUsers();
};

async function loadUsers() {
  const users = await fetch(`/users/${me}`).then(r => r.json());

  usersBox.innerHTML = "";

  users.forEach(u => {
    const div = document.createElement("div");
    div.className = "user";
    div.innerText = u.username;

    div.onclick = () => openChat(u.username);

    usersBox.appendChild(div);
  });
}

async function openChat(user) {
  selected = user;
  chatTitle.innerText = user;

  const msgs = await fetch(`/messages/${me}/${user}`).then(r => r.json());

  messages.innerHTML = "";

  msgs.forEach(renderMessage);

  messages.scrollTop = messages.scrollHeight;
}

sendBtn.onclick = () => {
  if (!selected || !msg.value.trim()) return;

  const payload = {
    from: me,
    to: selected,
    text: msg.value.trim()
  };

  socket.emit("message", payload);

  msg.value = "";
};
  
socket.on("message", data => {
  if (
    (data.from === me && data.to === selected) ||
    (data.from === selected && data.to === me)
  ) {
    renderMessage(data);
  }
});

function renderMessage(m) {
  const div = document.createElement("div");
  div.className = m.from === me ? "bubble me" : "bubble";
  div.textContent = m.text;

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}