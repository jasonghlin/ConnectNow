import {
  getPeer,
  socket,
  updateUsersList,
  updateRemoteVideos,
  removeRemoteVideo,
} from "./script.js";

let mainRoomName = "";
let groups = [];
let currentPeers = {};
let localStream = null;

export function saveMainRoomName() {
  const pathSegments = window.location.pathname.split("/");
  mainRoomName = pathSegments[pathSegments.length - 1];
  localStorage.setItem("mainRoomName", mainRoomName);
}

export function handleFinishGrouping(groupsData) {
  saveMainRoomName();
  groups = groupsData;
  reconnectPeers();
}

export function setLocalStream(stream) {
  localStream = stream;
}

async function reconnectPeers(groups) {
  console.log("Reconnecting peers with groups:", groups); // 添加日志输出
  const peer = getPeer();

  // Close all existing peer connections
  for (let peerId in currentPeers) {
    currentPeers[peerId].close();
    removeRemoteVideo(peerId);
  }
  currentPeers = {};

  const currentUserName = localStorage.getItem("username");
  const currentUserGroup = groups.find((group) =>
    group.members.includes(currentUserName)
  );

  console.log("Current user group:", currentUserGroup); // 添加日志输出

  if (!currentUserGroup) {
    console.error("Current user not found in any group");
    return;
  }

  const connectionPromises = currentUserGroup.members
    .filter((member) => member !== currentUserName)
    .map(async (member) => {
      try {
        const call = peer.call(member, localStream);
        await new Promise((resolve, reject) => {
          call.on("stream", (userVideoStream) => {
            updateRemoteVideos(member, userVideoStream);
            resolve();
          });
          call.on("error", reject);
        });
        currentPeers[member] = call;
      } catch (error) {
        console.error(`Error connecting to peer ${member}:`, error);
      }
    });

  try {
    await Promise.all(connectionPromises);
    console.log("All connections established");

    // Update server and UI
    socket.emit("group-arrangement", { mainRoomName, groups });
    updateUsersList();
  } catch (error) {
    console.error("Error during peer reconnection:", error);
  }
}

// Handle incoming calls
export function handleIncomingCall(call) {
  call.answer(localStream);
  call.on("stream", (userVideoStream) => {
    updateRemoteVideos(call.peer, userVideoStream);
  });
  currentPeers[call.peer] = call;
}

// Clean up connections when leaving the room
export function leaveRoom() {
  for (let peerId in currentPeers) {
    currentPeers[peerId].close();
  }
  currentPeers = {};
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
  }
  socket.emit("leave-room", mainRoomName);
}
