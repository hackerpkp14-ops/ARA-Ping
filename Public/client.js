const socket = io();

let me = "";
let currentUser = "";

const auth =
document.getElementById("auth");

const app =
document.getElementById("app");

const usersBox =
document.getElementById("users");

const messages =
document.getElementById("messages");

const chatHeader =
document.getElementById("chatHeader");

const messageInput =
document.getElementById("messageInput");

const imageInput =
document.getElementById("imageInput");

const profileBtn =
document.getElementById("profileBtn");

const profileModal =
document.getElementById("profileModal");

const closeProfileBtn =
document.getElementById("closeProfileBtn");

const profilePicInput =
document.getElementById("profilePicInput");

const profileAvatar =
document.getElementById("profileAvatar");

const profileUsername =
document.getElementById("profileUsername");

const searchOpenBtn =
document.getElementById("searchOpenBtn");

const searchModal =
document.getElementById("searchModal");

const closeSearchBtn =
document.getElementById("closeSearchBtn");

window.onload = ()=>{

  const saved =
  localStorage.getItem("ara-user");

  if(saved){

    me = saved;

    auth.style.display = "none";

    app.style.display = "flex";

    loadRecentChats();

  }

};

async function post(url,data){

  const res = await fetch(url,{

    method:"POST",

    headers:{
      "Content-Type":"application/json"
    },

    body:JSON.stringify(data)

  });

  return await res.json();

}

document
.getElementById("signupBtn")
.onclick = async()=>{

  const username =
  document
  .getElementById("username")
  .value
  .trim();

  const password =
  document
  .getElementById("password")
  .value
  .trim();

  const data =
  await post("/signup",{
    username,
    password
  });

  if(data.ok){

    alert("Signup successful");

  }else{

    alert(data.error);

  }

};

document
.getElementById("loginBtn")
.onclick = async()=>{

  const username =
  document
  .getElementById("username")
  .value
  .trim();

  const password =
  document
  .getElementById("password")
  .value
  .trim();

  const data =
  await post("/login",{
    username,
    password
  });

  if(!data.ok){

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

document
.getElementById("logoutBtn")
.onclick = ()=>{

  localStorage.removeItem(
    "ara-user"
  );

  location.reload();

};

async function loadRecentChats(){

  const res =
 await fetch("/chats/" + me);

  const users =
  await res.json();

  usersBox.innerHTML = "";

  users.forEach(addUserToSidebar);

}

function addUserToSidebar(user){

  const already =
  [...usersBox.children]
  .find(x=>
    x.dataset.username === user.username
  );

  if(already) return;

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

  div.onclick = ()=>{
    openChat(user.username);
  };

  usersBox.prepend(div);

}

document
.getElementById("searchBtn")
.onclick = async()=>{

  const username =
  document
  .getElementById("searchInput")
  .value
  .trim();

  if(!username) return;

  if(username === me){

    return alert(
      "Cannot search yourself"
    );

  }

  const res =
  await fetch("/search/" + username);

  const users =
  await res.json();

  if(users.length === 0){

    return alert("User not found");

  }

  addUserToSidebar({
    username:users[0].username,
    text:"Start conversation"
  });

};

async function openChat(user){

  currentUser = user;

  document.getElementById("chatName").innerText = user;

document
.getElementById("app")
.classList.add("chat-open");

  const res =
  await fetch(
    `/messages/${me}/${user}`
  );

  const data =
  await res.json();

  messages.innerHTML = "";

  data.forEach(renderMessage);

}

function renderMessage(m){

  if(
    (m.from === me &&
    m.to === currentUser)
    ||
    (m.from === currentUser &&
    m.to === me)
  ){

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
      ${
        m.text
        ?
        `<div>${m.text}</div>`
        :
        ""
      }

      ${
        m.image
        ?
        `<img src="${m.image}">`
        :
        ""
      }

      <span class="time">
        ${time}
      </span>
    `;

    messages.appendChild(div);

    messages.scrollTop =
    messages.scrollHeight;

  }

}

document
.getElementById("sendBtn")
.onclick = sendMessage;

async function sendMessage(){

  const text =
  messageInput.value.trim();

  if(!text || !currentUser){
    return;
  }

  const payload = {

    from:me,

    to:currentUser,

    text

  };

  socket.emit("message",payload);

  addUserToSidebar({
    username:currentUser,
    text
  });

  messageInput.value = "";

}

messageInput
.addEventListener(
  "keypress",
  (e)=>{

    if(e.key === "Enter"){

      sendMessage();

    }

  }
);

imageInput
.addEventListener(
  "change",
  async()=>{

    const file =
    imageInput.files[0];

    if(!file || !currentUser){
      return;
    }

    const form =
    new FormData();

    form.append("image",file);

    const res =
    await fetch("/upload",{

      method:"POST",

      body:form

    });

    const data =
    await res.json();

    socket.emit("message",{

      from:me,

      to:currentUser,

      image:data.image

    });

  }
);

socket.on("message",(data)=>{

  renderMessage(data);

  addUserToSidebar({
    username:
    data.from === me
    ? data.to
    : data.from,

    text:
    data.text || "📷 Image"
  });

});
document
.getElementById("backBtn")
.onclick = () => {

  document
  .getElementById("app")
  .classList.remove("chat-open");

};
searchOpenBtn.onclick = () => {

  searchModal.style.display =
  "flex";

};

closeSearchBtn.onclick = () => {

  searchModal.style.display =
  "none";

};
profileBtn.onclick = async () => {

  profileModal.style.display =
  "flex";

  const res =
  await fetch("/profile/" + me);

  const data =
  await res.json();

  profileUsername.innerText =
  data.username;

  if(data.profilePic){

    profileAvatar.innerHTML =
    `<img src="${data.profilePic}" style="width:100%;height:100%;border-radius:50%;">`;

  }else{

    profileAvatar.innerText =
    data.username[0]
    .toUpperCase();

  }

};
closeProfileBtn.onclick = () => {

  profileModal.style.display =
  "none";

};
profilePicInput.addEventListener(
  "change",
  async () => {

    const file =
    profilePicInput.files[0];

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

    if(data.ok){

      profileAvatar.innerHTML =
      `<img src="${data.image}" style="width:100%;height:100%;border-radius:50%;">`;

      alert(
        "Profile updated"
      );

      loadRecentChats();

    }

  }
);
const settingsBtn =
document.getElementById("settingsBtn");

const settingsModal =
document.getElementById("settingsModal");

settingsBtn.onclick = () => {

  settingsModal.classList.add("show");

};

settingsModal.onclick = (e)=>{

  if(e.target === settingsModal){

    settingsModal.classList.remove("show");

  }

};