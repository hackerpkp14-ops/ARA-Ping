const socket = io();

let me = "";
let currentUser = "";

const auth = document.getElementById("auth");
const app = document.getElementById("app");
const usersBox = document.getElementById("users");
const messages = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const imageInput = document.getElementById("imageInput");

window.onload = () => {

  const saved = localStorage.getItem("ara-user");

  if (saved) {

    me = saved;

    auth.style.display = "none";
    app.style.display = "flex";

    loadRecentChats();
  }
};

async function post(url, data) {

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  return await res.json();
}

// SIGNUP

document.getElementById("signupBtn").onclick = async () => {

  const username =
    document.getElementById("username").value.trim();

  const password =
    document.getElementById("password").value.trim();

  const data = await post("/signup", {
    username,
    password
  });

  if (data.ok) {
    alert("Signup successful");
  } else {
    alert(data.error);
  }
};

// LOGIN

document.getElementById("loginBtn").onclick = async () => {

  const username =
    document.getElementById("username").value.trim();

  const password =
    document.getElementById("password").value.trim();

  const data = await post("/login", {
    username,
    password
  });

  if (!data.ok) {
    return alert(data.error);
  }

  me = data.username;

  localStorage.setItem(
    "ara-user",
    me
  );

  auth.style.display = "none";
  app.style.display = "flex";

  loadRecentChats();
};

// LOGOUT

const logoutBtn =
document.getElementById("logoutBtn");

if(logoutBtn){

  logoutBtn.onclick = () => {

    localStorage.removeItem("ara-user");
    location.reload();

  };
}

// LOAD CHATS

async function loadRecentChats() {

  const res =
    await fetch("/chats/" + me);

  const users =
    await res.json();

  usersBox.innerHTML = "";

  users.forEach(addUserToSidebar);
}

// SIDEBAR USER

function addUserToSidebar(user) {

  const already =
    [...usersBox.children]
      .find(x =>
        x.dataset.username === user.username
      );

  if (already) return;

  const div =
    document.createElement("div");

  div.className = "user";

  div.dataset.username =
    user.username;

  div.innerHTML = `
    <div class="userName">
      ${user.username}
    </div>

    <div class="lastMsg">
      ${user.lastMessage || user.text || ""}
    </div>
  `;

  div.onclick = () => {

    console.log(
      "CHAT CLICKED:",
      user.username
    );

    openChat(user.username);

  };

  usersBox.prepend(div);
}

// SEARCH

const searchBtn =
document.getElementById("searchBtn");

if(searchBtn){

searchBtn.onclick = async () => {

```
const username =
document
.getElementById("searchModalInput")
.value
.trim();

if(!username) return;

if(username === me){

  return alert(
    "Cannot search yourself"
  );

}

try{

  const res =
  await fetch(
    "/search/" + username
  );

  const users =
  await res.json();

  console.log(
    "SEARCH RESULT:",
    users
  );

  if(users.length === 0){

    return alert(
      "User not found"
    );

  }

  users.forEach(user => {

    addUserToSidebar({

      username:
      user.username,

      text:
      "Start conversation"

    });

  });

  searchModal.style.display =
  "none";

  document
  .getElementById(
    "searchModalInput"
  )
  .value = "";

}catch(err){

  console.error(err);

  alert(
    "Search failed"
  );

}
```

};

}


// OPEN CHAT

async function openChat(user) {

  console.log(
    "OPENCHAT RUNNING:",
    user
  );

  currentUser = user;

  document.getElementById(
    "chatName"
  ).innerText = user;

  document
    .getElementById("app")
    .classList.add("chat-open");

  const res =
    await fetch(
      `/messages/${me}/${user}`
    );

  console.log(
    "FETCH STATUS:",
    res.status
  );

  const data =
    await res.json();

  console.log(
    "MESSAGES:",
    data
  );

  messages.innerHTML = "";

  data.forEach(renderMessage);
}

// RENDER MESSAGE

function renderMessage(m){

  const div =
  document.createElement("div");

  div.className = "msg";

  if(m.from === me){
    div.classList.add("mine");
  }

  const time =
  new Date(m.createdAt)
  .toLocaleTimeString([],{
    hour:"2-digit",
    minute:"2-digit"
  });

  div.innerHTML = `
    ${m.text ? `<div>${m.text}</div>` : ""}
    ${m.image ? `<img src="${m.image}">` : ""}
    <span class="time">${time}</span>
  `;

  messages.appendChild(div);

  messages.scrollTop =
  messages.scrollHeight;

}

// SEND MESSAGE

document
.getElementById("sendBtn")
.onclick = sendMessage;

async function sendMessage() {

  const text =
    messageInput.value.trim();

  if (!text || !currentUser) {
    return;
  }

  socket.emit("message", {

    from: me,
    to: currentUser,
    text

  });

  messageInput.value = "";
}

// ENTER KEY

messageInput.addEventListener(
  "keypress",
  (e) => {

    if (e.key === "Enter") {

      sendMessage();

    }
  }
);

// IMAGE

imageInput.addEventListener(
  "change",
  async () => {

    const file =
      imageInput.files[0];

    if (!file ||
      !currentUser) {
      return;
    }

    const form =
      new FormData();

    form.append(
      "image",
      file
    );

    const res =
      await fetch(
        "/upload",
        {
          method: "POST",
          body: form
        }
      );

    const data =
      await res.json();

    socket.emit(
      "message",
      {
        from: me,
        to: currentUser,
        image: data.image
      }
    );
  }
);

// SOCKET MESSAGE

socket.on(
"message",
(data) => {

```
if(
  (
    data.from === currentUser &&
    data.to === me
  )
  ||
  (
    data.from === me &&
    data.to === currentUser
  )
){
  renderMessage(data);
}

addUserToSidebar({

  username:
  data.from === me
  ? data.to
  : data.from,

  text:
  data.text || "📷 Image"

});
```

}
);


// MOBILE BACK

const backBtn =
document.getElementById(
  "backBtn"
);

if(backBtn){

  backBtn.onclick = () => {

    document
      .getElementById("app")
      .classList.remove(
        "chat-open"
      );

  };
}

// SETTINGS MODAL

const settingsBtn =
document.getElementById(
  "settingsBtn"
);

const settingsModal =
document.getElementById(
  "settingsModal"
);

if (
  settingsBtn &&
  settingsModal
) {

  settingsBtn.onclick = () => {

    settingsModal
    .classList.add(
      "show"
    );

  };

  settingsModal.onclick =
  (e) => {

    if (
      e.target ===
      settingsModal
    ) {

      settingsModal
      .classList.remove(
        "show"
      );

    }
  };
}
const searchOpenBtn =
document.getElementById("searchOpenBtn");

const searchModal =
document.getElementById("searchModal");

const closeSearchBtn =
document.getElementById("closeSearchBtn");

if(searchOpenBtn){

  searchOpenBtn.onclick = () => {

    searchModal.style.display =
    "flex";

  };

}

if(closeSearchBtn){

  closeSearchBtn.onclick = () => {

    searchModal.style.display =
    "none";

  };

}