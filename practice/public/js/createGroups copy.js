document.getElementById("createGroups").addEventListener("click", createGroups);
document
  .getElementById("finishGrouping")
  .addEventListener("click", finishGrouping);
document.getElementById("startTimer").addEventListener("click", startTimer);

let timerInterval;

async function createGroups() {
  const groupCount = document.getElementById("groupCount").value;
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

  const members = [];
  for (let i = 0; i < totalMembers; i++) {
    members.push(users[i].name);
  }

  const groups = [];
  for (let i = 0; i < groupCount; i++) {
    groups.push([]);
  }

  let groupIndex = 0;
  while (members.length > 0) {
    const member = members.shift();
    groups[groupIndex].push(member);
    groupIndex = (groupIndex + 1) % groupCount;
  }

  for (let i = 0; i < groupCount; i++) {
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

    groups[i].forEach((memberName, j) => {
      const memberDiv = document.createElement("div");
      memberDiv.className = "member";
      memberDiv.draggable = true;
      memberDiv.ondragstart = drag;
      memberDiv.id = `member-${i}-${j}`;
      memberDiv.innerText = memberName;
      memberContainer.appendChild(memberDiv);
    });

    groupDiv.appendChild(memberContainer);
    roomsContainer.appendChild(groupDiv);
    updateGroupHeight(groupDiv);
  }
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
  if (
    event.target.classList.contains("group") ||
    event.target.classList.contains("member-container")
  ) {
    event.target.querySelector(".member-container").appendChild(member);
    updateGroupHeight(event.target);
  } else if (event.target.classList.contains("member")) {
    event.target.parentElement.appendChild(member);
    updateGroupHeight(event.target.parentElement.parentElement);
  }
}

function finishGrouping() {
  const groups = [];
  const groupElements = document.getElementsByClassName("group");

  Array.from(groupElements).forEach((groupElement) => {
    const group = {
      name: groupElement.querySelector(".groupLabel").innerText,
      members: [],
    };
    const memberElements = groupElement.getElementsByClassName("member");

    Array.from(memberElements).forEach((memberElement) => {
      group.members.push(memberElement.innerText);
    });

    groups.push(group);
  });

  // Send the groups data to the backend
  fetch("/api/save-groups", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(groups),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Success:", data);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

function startTimer() {
  const timerInput = document.getElementById("timerInput").value;
  const timeLeftDisplay = document.getElementById("timeLeft");
  let timeLeft = parseInt(timerInput);

  if (timerInterval) {
    clearInterval(timerInterval);
  }

  timerInterval = setInterval(() => {
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      alert("Time is up! Returning to the main room.");
      // Add any logic here for what should happen when the timer ends
    } else {
      timeLeft--;
      timeLeftDisplay.innerText = timeLeft;
    }
  }, 1000);

  timeLeftDisplay.innerText = timeLeft;
}

function createGroupsPanelShow() {
  const breakoutRoomBtn = document.querySelector(".breakout-room");

  const breakouRoomPanel = document.querySelector(".breakout-room-panel");
  breakoutRoomBtn.addEventListener("click", () => {
    breakouRoomPanel.classList.add("show");
    document.body.classList.add("panel-open");
  });
}
createGroupsPanelShow();
