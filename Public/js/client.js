const socket = io();

let me = "";
let currentUser = "";
let onlineUsers = [];

socket.on(
"online-users",
users => {


onlineUsers = users;

if(currentUser){

  document
  .getElementById(
    "chatStatus"
  )
  .innerText =

  onlineUsers.includes(
    currentUser
  )
  ? "Online"
  : "Offline";


}

}
);

const auth = document.getElementById("auth");
const app = document.getElementById("app");
const usersBox = document.getElementById("users");
const messages = document.getElementById("messages");
const imageInput = document.getElementById("imageInput");
const sidebarUsers = {};
const unreadCounts = {};
const messageInput = document.getElementById("messageInput");

let typingTimeout;

messageInput.addEventListener("input", () => {

  console.log("EMITTING TYPING");

  if (!currentUser) return;

  socket.emit("typing", {
    from: me,
    to: currentUser
  });

  clearTimeout(typingTimeout);

  typingTimeout = setTimeout(() => {

    socket.emit("stop-typing", {
      from: me,
      to: currentUser
    });

  }, 1000);

});


window.onload = () => {

  const saved = localStorage.getItem("ara-user");

  if (saved) {

me = saved;

socket.emit(
"user-online",
me
);

auth.style.display = "none";

app.style.display = "flex";

loadRecentChats();
loadMyProfile();

}

};

async function loadMyProfile() {

  console.log("LOAD PROFILE START");

  const res =
  await fetch(
    "/user/" + me
  );

  const user =
  await res.json();

  console.log("USER:", user);

  const img =
  document.getElementById(
    "profilePreview"
  );

  console.log("IMG:", img);

  if(img){

    img.src =
    user.profilePic;

    console.log(
      "SRC SET TO:",
      img.src
    );

  }

}

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

socket.emit(
"user-online",
me
);

auth.style.display = "none";
app.style.display = "flex";

loadRecentChats();
loadMyProfile();
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

  users.forEach(user => {

    if (sidebarUsers[user.username]) {

      updateSidebarUser(user);

    } else {

      addUserToSidebar(user);

    }

  });

}
// SIDEBAR USER
function addUserToSidebar(user) {

  const already = sidebarUsers[user.username];

  if (already) {

    updateSidebarUser(user);

    return;

  }

  const div = document.createElement("div");

  div.className = "user";

  div.dataset.username = user.username;

  const time = user.lastTime
    ? new Date(user.lastTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
    : "";

  div.innerHTML = `

    <img
      class="sidebarProfile"
      src="${
        user.profilePic ||
        "https://ui-avatars.com/api/?name=" +
        encodeURIComponent(user.username)
      }"
    >

    <div class="userInfo">

      <div class="userTop">

        <div class="userName">
          ${user.username}
        </div>

        <div class="chatTime">
          ${time}
        </div>

      </div>

      <div class="userBottom">

        <div class="lastMsg">
          ${user.lastMessage || user.text || ""}
        </div>

        ${
          user.unread > 0
            ? `<div class="unreadBadge">${user.unread}</div>`
            : ""
        }

      </div>

    </div>

  `;

  div.onclick = () => {

    openChat(user.username);

  };

  sidebarUsers[user.username] = div;

  usersBox.prepend(div);

}

function updateSidebarUser(user) {

  const div = sidebarUsers[user.username];

  if (!div) return;

  // Last message
  div.querySelector(".lastMsg").innerText =
    user.lastMessage || user.text || "";

  // Time
  if (user.lastTime) {

    div.querySelector(".chatTime").innerText =
      new Date(user.lastTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });

  }

  // Update unread badge
  let badge =
    div.querySelector(".unreadBadge");

  if (user.unread > 0) {

    if (!badge) {

      badge = document.createElement("div");

      badge.className = "unreadBadge";

      div.querySelector(".userBottom")
        .appendChild(badge);

    }

    badge.innerText = user.unread;

  } else if (badge) {

    badge.remove();

  }

  // Move only when a new message arrives
if (user.lastMessage || user.text || user.lastTime) {
  moveUserToTop(user.username);
}

}

function moveUserToTop(username) {

  const div = sidebarUsers[username];

  if (!div) return;

  usersBox.prepend(div);

}




// SEARCH

const searchBtn =
document.getElementById("searchBtn");

if(searchBtn){

searchBtn.onclick = async () => {


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


};

}


// OPEN CHAT

async function openChat(user) {

  console.log(
    "OPENCHAT RUNNING:",
    user
  );

  currentUser = user;
  document.getElementById("chatName").innerText = user;

document
  .getElementById("app")
  .classList.add("chat-open");

  const seenRes = await fetch(
  "/seen",
  {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      from: user,
      to: me
    })
  }
);

console.log(
  "SEEN REQUEST STATUS:",
  seenRes.status
);
unreadCounts[user] = 0;

clearUnread(user);

function clearUnread(username) {

  const div = sidebarUsers[username];

  if (!div) return;

  const badge = div.querySelector(".unreadBadge");

  if (badge) {
    badge.remove();
  }

  unreadCounts[username] = 0;

}



  // NEW CODE START
  fetch(`/profile/${user}`)
.then(res => res.json())
.then(profileData => {

    if(profileData.ok){

        document.getElementById("chatAvatar").src =
        profileData.profilePic ||
        "https://ui-avatars.com/api/?name=" +
        encodeURIComponent(user);

    }

});
  // NEW CODE END



  console.log("USER:", user);
console.log("ONLINE USERS:", onlineUsers);
console.log("INCLUDES:", onlineUsers.includes(user));

document.getElementById("chatStatus").innerText =
  onlineUsers.includes(user)
    ? "Online"
    : "Offline";

console.log(
  "Status after openChat:",
  document.getElementById("chatStatus").innerText
);

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

function renderMessage(m) {

  const div =
    document.createElement("div");

  div.className = "msg";
  div.dataset.messageId = m._id;

  if (m.from === me) {
    div.classList.add("mine");
  }

  const time =
    new Date(m.createdAt)
      .toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });

  const tick =
  m.from === me
    ? `<span
        class="messageTick"
        data-message-id="${m._id || ""}"
      >${m.seen ? "✓✓" : "✓"}</span>`
    : "";

  div.innerHTML = `
  <div class="messageContent">

    ${m.text ? m.text : ""}
    ${m.image ? `` : ""}

    <span class="time">
      ${time}
      ${tick}
    </span>

  </div>

  <div class="reactions"></div>
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
messageInput.addEventListener("input", () => {

  if (!currentUser) return;

  socket.emit("typing", {

    from: me,

    to: currentUser

  });

  clearTimeout(typingTimeout);

  typingTimeout = setTimeout(() => {

    socket.emit("stop-typing", {

      from: me,

      to: currentUser

    });

  }, 1000);

});


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

socket.on("message", (data) => {

  console.log("SOCKET MESSAGE RECEIVED:", data);

  const isCurrentChat =
    (
      data.from === currentUser &&
      data.to === me
    ) ||
    (
      data.from === me &&
      data.to === currentUser
    );

  console.log("CURRENT USER:", currentUser);
  console.log("ME:", me);
  console.log("FROM:", data.from);
  console.log("TO:", data.to);
  console.log("IS CURRENT CHAT:", isCurrentChat);


  if (isCurrentChat) {

    console.log("RENDERING MESSAGE NOW");

    renderMessage(data);

    // If the chat is already open,
    // mark the incoming message as seen.
    if (data.to === me) {

      fetch("/seen", {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          from: data.from,
          to: me
        })

      });

    }

  } else {

    console.log(
      "NOT RENDERING — DIFFERENT CHAT"
    );

  }


  const other =
    data.from === me
      ? data.to
      : data.from;


  const chatData = {

    username: other,

    lastMessage:
      data.text || "📷 Image",

    lastTime:
      data.createdAt,

    unread:
      data.to === me &&
      currentUser !== other
        ? (unreadCounts[other] || 0) + 1
        : 0

  };


  unreadCounts[other] =
    chatData.unread;


  if (sidebarUsers[other]) {

    updateSidebarUser(chatData);

  } else {

    loadRecentChats();

  }

});
socket.on("message-delivered", data => {

  console.log("MESSAGE DELIVERED:", data);

  const tick = document.querySelector(
    `.messageTick[data-message-id="${data.messageId}"]`
  );

  if (tick) {
    tick.innerText = "✓✓";
  }

});
socket.on("messages-seen", data => {

  console.log(
    "MESSAGES SEEN:",
    data
  );

  if (!data.messageIds) return;

  data.messageIds.forEach(id => {

    const tick =
      document.querySelector(
        `.messageTick[data-message-id="${id}"]`
      );

    if (tick) {

      tick.innerText = "✓✓";

      tick.classList.add("seen");

    }

  });

});
socket.on("typing", (data) => {

  if (
    data.from === currentUser &&
    data.to === me
  ) {

    document.getElementById("chatStatus").innerText =
      "Typing...";

  }

});

socket.on("stop-typing", (data) => {

  if (
    data.from === currentUser &&
    data.to === me
  ) {

    document.getElementById("chatStatus").innerText =
      onlineUsers.includes(currentUser)
        ? "Online"
        : "Offline";

  }

});
socket.on("message-reaction", (data) => {

  console.log(
    "REACTION RECEIVED:",
    data
  );

  const message =
    document.querySelector(
      `.msg[data-message-id="${data.messageId}"]`
    );

  if (!message) return;

  const reactions =
    message.querySelector(".reactions");

  if (!reactions) return;


  let reactionData =
    reactions.dataset.reactions
      ? JSON.parse(
          reactions.dataset.reactions
        )
      : {};


  if (data.reaction) {

    reactionData[data.username] =
      data.reaction;

  } else {

    delete reactionData[data.username];

  }


  reactions.dataset.reactions =
    JSON.stringify(reactionData);


  reactions.innerText =
    Object.values(reactionData)
      .join(" ");

});

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
const changeProfileBtn =
document.getElementById(
"changeProfileBtn"
);

const settingsProfilePicInput =
document.getElementById(
"settingsProfilePicInput"
);

if(
changeProfileBtn &&
settingsProfilePicInput
){

changeProfileBtn.onclick = () => {


settingsProfilePicInput.click();


};

settingsProfilePicInput.addEventListener(
"change",
async () => {


  const file =
  settingsProfilePicInput.files[0];

  if(!file) return;

  const form =
  new FormData();

  form.append(
    "image",
    file
  );

  form.append(
    "username",
    me
  );

  try{

    const res =
    await fetch(
      "/upload-profile",
      {
        method:"POST",
        body:form
      }
    );

    const data =
    await res.json();

    console.log(
      "PROFILE UPLOAD:",
      data
    );

    if(data.ok){

      const img =
      document.getElementById(
        "profilePreview"
      );

      if(img){
        img.src = data.image;
      }

      alert(
        "Profile picture updated"
      );

    }else{

      alert(
        "Upload failed"
      );

    }

  }catch(err){

    console.error(err);

    alert(
      "Upload failed"
    );

  }

}

);

}
const reactionMenu =
  document.createElement("div");

reactionMenu.id = "reactionMenu";

reactionMenu.innerHTML = `
  <button data-reaction="❤️">❤️</button>
  <button data-reaction="😂">😂</button>
  <button data-reaction="👍">👍</button>
  <button data-reaction="😮">😮</button>
  <button data-reaction="😢">😢</button>
  <button data-reaction="🔥">🔥</button>
`;

document.body.appendChild(
  reactionMenu
);

let reactionMessageId = null;

document.addEventListener(
  "contextmenu",
  (e) => {

    const message =
      e.target.closest(".msg");

    if (!message) return;

    e.preventDefault();

    reactionMessageId =
      message.querySelector(
        ".messageTick"
      )?.dataset.messageId;

    if (!reactionMessageId) {

      // For received messages that don't
      // have a tick, get the ID another way.
      reactionMessageId =
        message.dataset.messageId;

    }

    reactionMenu.classList.add("show");

const menuWidth =
  reactionMenu.offsetWidth;

const menuHeight =
  reactionMenu.offsetHeight;

let x = e.clientX;
let y = e.clientY;

if (
  x + menuWidth >
  window.innerWidth
) {

  x =
    window.innerWidth -
    menuWidth -
    10;

}

if (
  y + menuHeight >
  window.innerHeight
) {

  y =
    window.innerHeight -
    menuHeight -
    10;

}

reactionMenu.style.left =
  `${Math.max(10, x)}px`;

reactionMenu.style.top =
  `${Math.max(10, y)}px`;

  }
);

reactionMenu
  .querySelectorAll("button")
  .forEach(button => {

    button.onclick = () => {

      if (!reactionMessageId)
        return;

      socket.emit(
        "react-message",
        {
          messageId:
            reactionMessageId,

          username: me,

          reaction:
            button.dataset.reaction
        }
      );

      reactionMenu.classList.remove(
        "show"
      );

      reactionMessageId = null;

    };

  });
  let longPressTimer = null;

document.addEventListener(
  "touchstart",
  (e) => {

    const message =
      e.target.closest(".msg");

    if (!message) return;

    longPressTimer =
      setTimeout(() => {

        reactionMessageId =
          message.dataset.messageId;

        const rect =
          message.getBoundingClientRect();

        reactionMenu.style.left =
          `${rect.left + 20}px`;

        reactionMenu.style.top =
          `${rect.top - 50}px`;

        reactionMenu.classList.add(
          "show"
        );

      }, 600);

  }
);

document.addEventListener(
  "touchend",
  () => {

    clearTimeout(
      longPressTimer
    );

  }
);
