import { handleFinishGrouping } from "./groupHandler.js";

document.getElementById("createGroups").addEventListener("click", createGroups);
document
  .getElementById("finishGrouping")
  .addEventListener("click", finishGrouping);

let timerInterval;

async function createGroups() {
  const groupCount = parseInt(document.getElementById("groupCount").value);
  const roomsContainer = document.getElementById("roomsContainer");
  roomsContainer.innerHTML = "";
  let totalMembers;
  const token = localStorage.getItem("session");
  let users;
  try {
    const usersResponse = await fetch("/api/allUsers", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    users = await usersResponse.json();
    totalMembers = users.length;
  } catch (error) {
    console.log(error);
  }

  const members = users.map((user) => ({ id: user.id, name: user.name }));

  // 打亂成員順序
  for (let i = members.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [members[i], members[j]] = [members[j], members[i]];
  }

  // 建立空組
  const groups = Array.from({ length: groupCount }, () => []);

  // 平均分配成員到各組
  members.forEach((member, index) => {
    groups[index % groupCount].push(member);
  });

  // 顯示組別和成員
  groups.forEach((group, i) => {
    const groupDiv = document.createElement("div");
    groupDiv.className = "group";
    groupDiv.id = `group-${i}`;
    groupDiv.ondrop = drop;
    groupDiv.ondragover = allowDrop;

    const groupLabel = document.createElement("div");
    groupLabel.className = "groupLabel";
    groupLabel.innerText = `Group ${i + 1}`;
    groupDiv.appendChild(groupLabel);

    const memberContainer = document.createElement("div");
    memberContainer.className = "member-container";

    group.forEach((member, j) => {
      const memberDiv = document.createElement("div");
      memberDiv.className = "member";
      memberDiv.draggable = true;
      memberDiv.ondragstart = drag;
      memberDiv.id = `member-${i}-${j}`;
      memberDiv.dataset.userId = member.id;
      memberDiv.innerText = member.name;
      memberContainer.appendChild(memberDiv);
    });

    groupDiv.appendChild(memberContainer);
    roomsContainer.appendChild(groupDiv);
    updateGroupHeight(groupDiv);
  });
}

function updateGroupHeight(groupDiv) {
  const memberCount = groupDiv.getElementsByClassName("member").length;
  const rows = Math.ceil(memberCount / 2);
  groupDiv.style.height = `${rows * 50 + 50}px`; // 每行50px高度，额外50px用于其他内容
}

function allowDrop(event) {
  event.preventDefault();
}

function drag(event) {
  event.dataTransfer.setData("text", event.target.id);
}

function drop(event) {
  event.preventDefault();
  const data = event.dataTransfer.getData("text");
  const member = document.getElementById(data);
  const targetGroup = event.target.closest(".group");

  if (targetGroup) {
    const memberContainer = targetGroup.querySelector(".member-container");
    memberContainer.appendChild(member);
    updateGroupHeight(targetGroup);
  }
}

async function finishGrouping() {
  const timerInputValue = parseInt(document.getElementById("timerInput").value);

  // set mainRoom localStorage
  const currentUrl = window.location.href;
  const mainRoomName = currentUrl.substring(currentUrl.lastIndexOf("/") + 1);
  console.log("mainRoomName:", mainRoomName);
  localStorage.setItem("mainRoom", mainRoomName);

  const groups = [];
  const groupElements = document.getElementsByClassName("group");
  const mainRoom = localStorage.getItem("mainRoom");
  Array.from(groupElements).forEach((groupElement) => {
    const group = {
      name: groupElement.querySelector(".groupLabel").innerText,
      members: [],
    };
    const memberElements = groupElement.getElementsByClassName("member");

    Array.from(memberElements).forEach((memberElement) => {
      group.members.push({
        id: memberElement.dataset.userId,
        name: memberElement.innerText,
      });
    });

    groups.push({ group, mainRoom });
  });

  // Send the groups data to the backend
  fetch("/api/save-groups", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("session")}`,
    },
    body: JSON.stringify(groups),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Success:", data);

      // Call the new function from groupHandler.js
      handleFinishGrouping(data.data, timerInputValue);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

function createGroupsPanelShow() {
  const breakoutRoomBtn = document.querySelector(".breakout-room");
  const breakouRoomPanel = document.querySelector(".breakout-room-panel");
  const closeBreakoutRoomButton = document.getElementById(
    "close-breakout-room"
  );
  const body = document.body;

  breakoutRoomBtn.addEventListener("click", () => {
    breakouRoomPanel.classList.add("show");
    document.body.classList.add("panel-open");
  });

  closeBreakoutRoomButton.addEventListener("click", () => {
    breakouRoomPanel.classList.remove("show");
    body.classList.remove("panel-open");
  });
}
createGroupsPanelShow();
