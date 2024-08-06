import {
  updateUsersList,
  updateRemoteVideos,
  removeRemoteVideo,
  connectToNewUser,
} from "./script.js";

let localStream;
let peers = {};
let currentRoom = "mainRoom";
let socket;
let peerInstance;

export function setLocalStream(stream) {
  localStream = stream;
}

export function setPeers(peersObj) {
  peers = peersObj;
}

export function initializeSocketListeners(socketInstance, peerObj) {
  socket = socketInstance;
  peerInstance = peerObj;

  socket.on("user-connected", (userId, userName) => {
    console.log("New user connected to room:", userId, userName);
    connectToNewUser(userId, localStream);
  });

  socket.on("user-disconnected", (userId) => {
    console.log("User disconnected from room:", userId);
    if (peers[userId]) {
      peers[userId].close();
      delete peers[userId];
    }
    removeRemoteVideo(userId);
  });

  socket.on("group-created", (group) => {
    console.log("New group created:", group);
    // Update UI to reflect new grouping
  });

  socket.on("user-left-group", (userId) => {
    console.log("User left group:", userId);
    // Update UI to reflect user leaving
  });

  socket.on("user-joined-main-room", (userId) => {
    console.log("User returned to main room:", userId);
    connectToNewUser(userId, localStream);
  });

  socket.on("reconnect-all", () => {
    console.log("Reconnecting all users to main room");
    returnToMainRoom();
  });
}

export function handleIncomingCall(call) {
  call.answer(localStream);
  const userId = call.peer;
  call.on("stream", (userVideoStream) => {
    updateRemoteVideos(userId, userVideoStream);
  });
  peers[userId] = call;
}

export async function handleFinishGrouping(groupsData) {
  const currentUrl = window.location.href;
  const mainRoomName = localStorage.getItem("mainRoom");
  // 獲取用戶認證信息
  const response = await fetch("/api/user/auth", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("session")}`,
    },
  });
  const payload = await response.json();
  const currentUserId = payload.payload.userId;

  // 將 groupName 保存到 localStorage
  groupsData.forEach((group) => {
    if (group.userId == currentUserId) {
      localStorage.setItem(`breakoutRoom`, group.groupName);
    }
  });

  // 查找當前用戶所在的組
  const userGroup = groupsData.find((group) => group.userId == currentUserId);

  if (userGroup) {
    const groupName = localStorage.getItem(`breakoutRoom`);
    currentRoom = groupName;

    // 更新 URL 並重定向
    const newUrl = currentUrl.replace(mainRoomName, groupName);
    history.pushState(null, "", newUrl);

    // 斷開所有當前的 peer 連接
    Object.values(peers).forEach((call) => call.close());
    peers = {};

    // 清除所有遠端視訊
    document
      .querySelectorAll("video:not(.local-stream)")
      .forEach((video) => video.remove());

    // 加入新的組
    socket.emit("join-room", currentRoom, peerInstance.id, currentUserId);

    // 開始倒數計時
    const timerInput = document.getElementById("timerInput").value;
    startCountdown(parseInt(timerInput));
  } else {
    console.error("User is not part of any group.");
  }
}

function startCountdown(seconds) {
  const timerDisplay = document.getElementById("timerDisplay");
  timerDisplay.style.display = "block";

  const countdownInterval = setInterval(() => {
    timerDisplay.textContent = `Time left: ${seconds} seconds`;
    seconds--;

    if (seconds < 0) {
      clearInterval(countdownInterval);
      timerDisplay.style.display = "none";
      returnToMainRoom();
    }
  }, 1000);
}

async function returnToMainRoom() {
  // 斷開所有當前的 peer 連接
  Object.values(peers).forEach((call) => call.close());
  peers = {};

  // 清除所有遠端視訊
  document
    .querySelectorAll("video:not(.local-stream)")
    .forEach((video) => video.remove());

  // 重新加入主房間
  const mainRoom = localStorage.getItem("mainRoom");
  const response = await fetch("/api/user/auth", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("session")}`,
    },
  });
  const payload = await response.json();
  currentRoom = mainRoom;
  socket.emit(
    "join-room",
    currentRoom,
    peerInstance.id,
    payload.payload.userId
  );

  // 更新 URL 以反映主房間
  history.pushState(null, "", `/roomId/${mainRoom}`);

  // 更新用戶列表
  await updateUsersList();
}

export function leaveRoom() {
  Object.values(peers).forEach((call) => call.close());
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
  }
  socket.emit("leave-room", currentRoom);
}

export function createGroup(groupName, members) {
  socket.emit("create-group", groupName, members);
}

export function leaveGroup(userId, groupId) {
  socket.emit("leave-group", userId, groupId);
}
