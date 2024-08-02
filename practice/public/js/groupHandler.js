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

async function reconnectPeers() {
  const peer = getPeer();

  // Close all existing peer connections
  for (let peerId in currentPeers) {
    currentPeers[peerId].close();
  }
  currentPeers = {};

  // Find the group that the current user belongs to
  const currentUserName = localStorage.getItem("username"); // Ensure this is set when user logs in
  let currentUserGroup = null;
  for (let group of groups) {
    if (group.members.includes(currentUserName)) {
      currentUserGroup = group;
      break;
    }
  }

  if (!currentUserGroup) {
    console.error("Current user not found in any group");
    return;
  }

  // Connect to all peers in the same group
  for (let member of currentUserGroup.members) {
    if (member !== currentUserName) {
      try {
        const call = peer.call(member, localStream);
        call.on("stream", (userVideoStream) => {
          updateRemoteVideos(member, userVideoStream);
        });
        call.on("close", () => {
          removeRemoteVideo(member);
        });
        currentPeers[member] = call;
      } catch (error) {
        console.error(`Error connecting to peer ${member}:`, error);
      }
    }
  }

  // Notify the server about the new group arrangement
  socket.emit("group-arrangement", {
    mainRoomName: mainRoomName,
    groups: groups,
  });

  // Update the user list in the UI
  updateUsersList();
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
}
