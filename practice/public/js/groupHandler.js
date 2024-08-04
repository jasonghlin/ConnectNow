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

export async function handleFinishGrouping(groups) {
  const currentUrl = window.location.href;
  const mainRoomName = currentUrl.substring(currentUrl.lastIndexOf("/") + 1);
  localStorage.setItem("mainRoom", mainRoomName);

  // Disconnect from all current peers
  Object.values(peers).forEach((call) => call.close());
  peers = {};

  // Clear all remote videos
  document
    .querySelectorAll("video:not(.local-stream)")
    .forEach((video) => video.remove());

  // Join new room based on group
  const userGroup = groups.find((group) =>
    group.members.includes(localStorage.getItem("username"))
  );
  if (userGroup) {
    const response = await fetch("/api/user/auth", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("session")}`,
      },
    });
    const payload = await response.json();
    currentRoom = userGroup.name;
    console.log(`peerId: ${peerInstance.id}`);
    socket.emit(
      "join-room",
      currentRoom,
      peerInstance.id,
      payload.payload.userId
    );
  }

  // Start countdown timer
  const timerInput = document.getElementById("timerInput").value;
  startCountdown(parseInt(timerInput));
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
  // Disconnect from all current peers
  Object.values(peers).forEach((call) => call.close());
  peers = {};

  // Clear all remote videos
  document
    .querySelectorAll("video:not(.local-stream)")
    .forEach((video) => video.remove());

  // Rejoin the main room
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

  // Update the URL to reflect the main room
  history.pushState(null, "", `/roomId/${mainRoom}`);

  // Update the users list
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
