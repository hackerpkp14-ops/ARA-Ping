// Sidebar Module

const sidebarUsers = {};
const unreadCounts = {};

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

  const already =
  sidebarUsers[user.username];

if (already) {

  updateSidebarUser(user);

  return;

}

  const div =
    document.createElement("div");

  div.className = "user";

  div.dataset.username =
    user.username;

  const time =
    user.lastTime
    ? new Date(user.lastTime)
        .toLocaleTimeString([], {
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
          ${user.lastMessage || ""}
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
      new Date(user.lastTime)
        .toLocaleTimeString([], {

          hour: "2-digit",

          minute: "2-digit"

        });

  }
  function moveUserToTop(username){

  const div = sidebarUsers[username];

  if(!div) return;

  usersBox.prepend(div);

  }
}