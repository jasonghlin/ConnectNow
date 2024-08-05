import { handleMicList } from "./userInputOutput.js";
import { checkStatus } from "../../utils/loginOutAndRegister.js";
import {
  updateVideoLayout,
  handleUserConnected,
  handleUserDisconnected,
} from "./videoLayout.js";
import {
  handleIncomingCall,
  setLocalStream,
  leaveRoom,
  initializeSocketListeners,
  setPeers,
} from "./groupHandler.js";
import { toggleMic } from "./micHandler.js"; // 新增這一行

// 全局變量
let localStream = null; // 本地視訊流
let currentStream = null; // 當前的流（視訊或螢幕）
let videoEnabled = true; // 視訊狀態
let remoteVideos = new Map(); // 遠程視訊列表
let isScreenSharing = false; // 螢幕分享狀態

// 獲取房間 ID
const pathSegments = window.location.pathname.split("/");
const roomId = pathSegments[pathSegments.length - 1];
document.getElementById("currentRoomId").textContent = roomId;

// 建立 Socket.io 連接
let peerInstance = null;
const socket = io("http://localhost:8080");

socket.on("connect", () => {
  console.log("Connected to server");
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
});

socket.on("update-stream", (userId, streamId, isScreenShare) => {
  if (remoteVideos.has(userId)) {
    const video = remoteVideos.get(userId);
    video.srcObject = document.getElementById(streamId).srcObject;
    if (isScreenShare) {
      video.style.position = "absolute";
      video.style.top = "0";
      video.style.left = "0";
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.zIndex = "9999";
    } else {
      video.style.position = "";
      video.style.top = "";
      video.style.left = "";
      video.style.width = "";
      video.style.height = "";
      video.style.zIndex = "";
    }
    updateVideoLayout();
  }
});

const videoStreamDiv = document.querySelector(".video-stream");
const peers = {};

export function getPeer() {
  if (!peerInstance) {
    peerInstance = new Peer(undefined, {
      host: "localhost",
      port: 9001,
      path: "/myapp",
    });
  }
  return peerInstance;
}

// 主房間類
class MainRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.peers = new Map();
    this.breakoutRooms = new Map();
  }

  addPeer(peerId, peer) {
    this.peers.set(peerId, peer);
  }

  removePeer(peerId) {
    this.peers.delete(peerId);
  }
}

let mainRoom;
let currentRoom;

function initializeMainRoom() {
  mainRoom = new MainRoom(roomId);
  currentRoom = mainRoom;
}

const addVideoStream = (video, stream, userId, isScreenShare = false) => {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  video.setAttribute("data-user-id", userId);
  if (isScreenShare) {
    video.style.position = "absolute";
    video.style.top = "0";
    video.style.left = "0";
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.zIndex = "9999";
  }
  if (!videoStreamDiv.contains(video)) {
    videoStreamDiv.append(video);
    updateVideoLayout();
  }
};

export const switchStream = (newStream, isScreenShare = false) => {
  currentStream = newStream;

  const myVideo = document.querySelector(".local-stream");
  if (myVideo) {
    myVideo.srcObject = newStream;
    if (isScreenShare) {
      myVideo.classList.remove("invert-screen");
      myVideo.style.position = "absolute";
      myVideo.style.top = "0";
      myVideo.style.left = "0";
      myVideo.style.width = "100%";
      myVideo.style.height = "100%";
      myVideo.style.zIndex = "9999";
    } else {
      myVideo.classList.add("invert-screen");
      myVideo.style.position = "";
      myVideo.style.top = "";
      myVideo.style.left = "";
      myVideo.style.width = "";
      myVideo.style.height = "";
      myVideo.style.zIndex = "";
    }
  }

  for (let userId in peers) {
    const sender = peers[userId].peerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    if (sender) {
      sender
        .replaceTrack(newStream.getVideoTracks()[0])
        .then(() => {
          console.log("Stream replaced successfully");
          socket.emit("update-stream", userId, newStream.id, isScreenShare);
        })
        .catch((error) => {
          console.error("Error replacing stream:", error);
        });
    }
  }
};

const toggleVideo = async () => {
  videoEnabled = !videoEnabled;

  if (videoEnabled) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      localStream = stream;
      currentStream = stream;
      switchStream(localStream);
    } catch (error) {
      console.error("Error accessing camera: ", error);
    }
  } else {
    localStream.getVideoTracks().forEach((track) => track.stop());
    const blackStream = localStream.clone();
    blackStream.getVideoTracks().forEach((track) => (track.enabled = false));
    switchStream(blackStream);
  }

  for (let userId in peers) {
    const sender = peers[userId].peerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    if (sender) {
      sender.track.enabled = videoEnabled;
    }
  }
};

document.querySelector(".video").addEventListener("click", toggleVideo);

// 新增事件監聽器：切換麥克風
document
  .querySelector(".mic-icon")
  .addEventListener("click", () => toggleMic(localStream));

const renderRemoteVideos = () => {
  remoteVideos.forEach((video, userId) => {
    if (!videoStreamDiv.contains(video)) {
      videoStreamDiv.appendChild(video);
    }
  });
  updateVideoLayout();
};

const updateRemoteVideos = (userId, stream, isScreenShare = false) => {
  if (remoteVideos.has(userId)) {
    const existingVideo = remoteVideos.get(userId);
    existingVideo.srcObject = stream;
    if (isScreenShare) {
      existingVideo.style.position = "absolute";
      existingVideo.style.top = "0";
      existingVideo.style.left = "0";
      existingVideo.style.width = "100%";
      existingVideo.style.height = "100%";
      existingVideo.style.zIndex = "9999";
    } else {
      existingVideo.style.position = "";
      existingVideo.style.top = "";
      existingVideo.style.left = "";
      existingVideo.style.width = "";
      existingVideo.style.height = "";
      existingVideo.style.zIndex = "";
    }
  } else {
    const userVideo = document.createElement("video");
    userVideo.autoplay = true;
    userVideo.playsInline = true;
    if (isScreenShare) {
      userVideo.style.position = "absolute";
      userVideo.style.top = "0";
      userVideo.style.left = "0";
      userVideo.style.width = "100%";
      userVideo.style.height = "100%";
      userVideo.style.zIndex = "9999";
    }
    userVideo.setAttribute("data-user-id", userId);
    addVideoStream(userVideo, stream, userId, isScreenShare);
    remoteVideos.set(userId, userVideo);
  }
  renderRemoteVideos();
};

const removeRemoteVideo = (userId) => {
  console.log(`Removing video for user: ${userId}`);
  const videoElement = remoteVideos.get(userId);
  if (videoElement) {
    if (videoElement.srcObject) {
      const tracks = videoElement.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    }
    videoElement.remove();
    remoteVideos.delete(userId);
    console.log(`Video element removed for user: ${userId}`);
  }

  if (peers[userId]) {
    peers[userId].close();
    delete peers[userId];
    console.log(`Peer connection closed for user: ${userId}`);
  }

  updateVideoLayout();
};

window.addEventListener("beforeunload", () => {
  socket.emit("disconnect");
  for (let userId in peers) {
    removeRemoteVideo(userId);
  }
});

const usersButton = document.querySelector(".participants");
const usersPanel = document.getElementById("users-panel");
const closeUsersButton = document.getElementById("close-users");
const body = document.body;

usersButton.addEventListener("click", () => {
  usersPanel.classList.add("show");
  body.classList.add("panel-open");
});

closeUsersButton.addEventListener("click", () => {
  usersPanel.classList.remove("show");
  body.classList.remove("panel-open");
});

async function updateUsersList() {
  const participantsList = document.querySelector(".users-content");
  participantsList.innerHTML = "";
  const token = localStorage.getItem("session");
  try {
    const usersResponse = await fetch("/api/allUsers", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const usersList = await usersResponse.json();
    usersList.forEach((user) => {
      const userDiv = document.createElement("div");
      userDiv.textContent = user.name;
      participantsList.appendChild(userDiv);
    });
  } catch (error) {
    console.error("Error fetching users:", error);
  }
}

export function connectToNewUser(userId, stream) {
  const call = peerInstance.call(userId, stream);
  call.on("stream", (userVideoStream) => {
    console.log("Remote stream received:", userVideoStream.getTracks());
    updateRemoteVideos(userId, userVideoStream);
  });
  call.on("close", () => {
    removeRemoteVideo(userId);
  });

  peers[userId] = call;
}

(async function () {
  try {
    const payload = await checkStatus();
    console.log("Payload received:", payload);

    const path = window.location.pathname.split("/");
    const roomId = path[path.length - 1];
    const token = localStorage.getItem("session");

    const joinUserRoomResponse = await fetch("/api/joinMainRoom", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userInfo: payload.payload, roomId }),
    });

    if (!joinUserRoomResponse.ok) {
      throw new Error("Failed to join room");
    }
    console.log("Join room response:", joinUserRoomResponse);

    initializeMainRoom();

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setLocalStream(stream);
    localStream = stream;
    currentStream = stream;

    handleMicList(peers, localStream, switchStream);

    const myVideo = document.createElement("video");
    myVideo.classList.add("local-stream");
    myVideo.classList.add("invert-screen");
    myVideo.muted = true;
    if (!document.querySelector(".local-stream")) {
      addVideoStream(myVideo, stream, "local");
    }

    const peer = getPeer();
    peerInstance = peer;

    initializeSocketListeners(socket, peer);

    peer.on("open", (id) => {
      console.log("My peer ID is: " + id);
      const userId = payload.payload.userId;
      console.log(
        "Joining room with userId:",
        userId,
        "peerId:",
        id,
        "roomId:",
        roomId
      );

      if (userId && id) {
        socket.emit("join-room", roomId, id, userId);
        mainRoom.addPeer(id, peer);
      } else {
        console.error("userId or peerId is undefined");
      }
    });

    peer.on("call", handleIncomingCall);

    setPeers(peers);

    renderRemoteVideos();
    window.addEventListener("beforeunload", leaveRoom);
  } catch (err) {
    console.error("Error initializing the room:", err);
  }
})();

export {
  socket,
  updateUsersList,
  updateRemoteVideos,
  removeRemoteVideo,
  localStream,
};
