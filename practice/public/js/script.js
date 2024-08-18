import { handleMicList } from "./userInputOutput.js";
import { checkStatus } from "../utils/loginOutAndRegister.js";
import {
  updateVideoLayout,
  handleUserConnected,
  handleUserDisconnected,
} from "./videoLayout.js";
import {
  setLocalStream,
  leaveRoom,
  initializeSocketListeners,
  setPeers,
} from "./groupHandler.js";
import { toggleMic } from "./micHandler.js";

import { handleFinishGrouping } from "./groupHandler.js";
import {
  startBackgroundEffects,
  initializeSegmenter,
  myStream,
  updateStreamForPeers,
} from "./backgroundEffects.js";

import { toggleVideo } from "./videoToggleHandler.js";

// 全局變量
let localStream = null; // 本地視訊流
let currentStream = null; // 當前的流（視訊或螢幕）
let videoEnabled = true; // 視訊狀態
let remoteVideos = new Map(); // 遠程視訊列表
let isScreenSharing = false; // 螢幕分享狀態
let myPeerId;

// 獲取房間 ID
const pathSegments = window.location.pathname.split("/");
const roomId = pathSegments[pathSegments.length - 1];
document.getElementById("currentRoomId").textContent = roomId;

// 建立 Socket.io 連接
let peerInstance = null;
const socket =
  window.location.protocol == "https:"
    ? io("https://www.connectnow.website")
    : io("http://localhost:8080");
// const socket = io("http://localhost:8080");
// const socket = io("https://www.connectnow.website");

socket.on("connect", () => {
  console.log("Connected to server");
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
});

socket.on("update-stream", (userId, streamId, isScreenShare) => {
  console.log(
    "userId",
    userId,
    "remoteVideos.has(userId): ",
    remoteVideos.has(userId),
    "remoteVideos.get(userId):",
    remoteVideos.get(userId)
  );
  if (remoteVideos.has(userId)) {
    const video = remoteVideos.get(userId);
    video.srcObject = document.querySelector(
      `[data-user-id="${userId}"]`
    ).srcObject;
    if (isScreenShare) {
      video.style.position = "absolute";
      video.style.top = "0";
      video.style.left = "0";
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.zIndex = "99";
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

socket.on("close-user-video", (peerId) => {
  if (peers[peerId]) {
    removeRemoteVideo(peerId); // 使用已經定義好的函數來關閉影像
  }
});

const videoStreamDiv = document.querySelector(".video-stream");
const peers = {};

export const getPeer =
  window.location.protocol == "https:"
    ? function () {
        if (!peerInstance) {
          peerInstance = new Peer(undefined, {
            host: "peer-server.connectnow.website",
            port: 443,
            path: "/myapp",
          });
        }
        return peerInstance;
      }
    : function () {
        if (!peerInstance) {
          peerInstance = new Peer(undefined, {
            host: "localhost",
            port: 9001,
            path: "/myapp",
          });
        }
        return peerInstance;
      };

// export function getPeer() {
//   if (!peerInstance) {
//     peerInstance = new Peer(undefined, {
//       host: "peer-server.connectnow.website",
//       port: 443,
//       path: "/myapp",
//     });
//   }
//   return peerInstance;
// }

// export function getPeer() {
//   if (!peerInstance) {
//     peerInstance = new Peer(undefined, {
//       host: "localhost",
//       port: 9001,
//       path: "/myapp",
//     });
//   }
//   return peerInstance;
// }

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

export const addVideoStream = (
  video,
  stream,
  userId,
  isScreenShare = false
) => {
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
    video.style.zIndex = "99";
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
      // myVideo.style.top = "0";
      // myVideo.style.left = "0";
      myVideo.style.width = "60%";
      myVideo.style.height = "80%";
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
          console.log(newStream);
          socket.emit("update-stream", userId, newStream.id, isScreenShare);
        })
        .catch((error) => {
          console.error("Error replacing stream:", error);
        });
    }
  }

  // 更新背景效果的 stream
  startBackgroundEffects();
};

// 使用新建的 toggleVideo 函數
document.querySelector(".video i").addEventListener("click", () => {
  toggleVideo(
    localStream,
    document.querySelector(".local-stream"),
    peers,
    socket,
    myPeerId
  );
});

// 新增事件監聽器：切換麥克風
document
  .querySelector(".mic-icon i")
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
      // existingVideo.style.top = "0";
      // existingVideo.style.left = "0";
      existingVideo.style.width = "60%";
      existingVideo.style.height = "80%";
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
      // userVideo.style.top = "0";
      // userVideo.style.left = "0";
      userVideo.style.width = "60%";
      userVideo.style.height = "80%";
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
  if (userId === myPeerId) {
    console.log("Skipping adding local stream to own video element");
    return;
  }
  const call = peerInstance.call(userId, myStream);
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
    if (!payload) {
      window.location.href = "/";
    }
    const path = window.location.pathname.split("/");
    const roomId = path[path.length - 1];
    const token = localStorage.getItem("session");

    const joinUserRoomResponse = await fetch(`/api/mainRoom/${roomId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userInfo: payload.payload }),
    });

    if (!joinUserRoomResponse.ok) {
      throw new Error("Failed to join room");
    }
    console.log("Join room response:", joinUserRoomResponse);

    initializeMainRoom();

    const currentUrl = window.location.href;
    const mainRoomName = currentUrl.substring(currentUrl.lastIndexOf("/") + 1);
    localStorage.setItem("mainRoom", mainRoomName);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    setLocalStream(stream);
    localStream = stream;
    currentStream = stream;

    // 检查音频轨道是否已启用
    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length > 0 && !audioTracks[0].enabled) {
      console.log("Audio track is disabled, enabling it now.");
      audioTracks[0].enabled = true;
    } else {
      console.log("Audio track is enabled.");
    }

    // 初始化背景效果
    await initializeSegmenter();
    handleMicList(peers, localStream, switchStream);

    const peer = getPeer();
    peerInstance = peer;

    initializeSocketListeners(socket, peer);

    peer.on("open", (id) => {
      console.log("My peer ID is: " + id);
      myPeerId = id;
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
        console.log("Emitting join-room event");
        socket.emit("join-room", roomId, id, userId);
        mainRoom.addPeer(id, peer);
      } else {
        console.error("userId or peerId is undefined");
      }
    });

    function handleIncomingCall(call, stream) {
      call.answer(stream);
      const userId = call.peer;
      call.on("stream", (userVideoStream) => {
        updateRemoteVideos(userId, userVideoStream);
      });
      peers[userId] = call;
    }

    peer.on("call", (call) => {
      // 使用最新的 myStream
      handleIncomingCall(call, myStream);
    });

    setPeers(peers);

    renderRemoteVideos();
    window.addEventListener("beforeunload", leaveRoom);

    document.querySelector(".bg-1").addEventListener("click", (e) => {
      startBackgroundEffects();
    });
    let hasJoinRequestListener = false; // 添加一個標誌來跟蹤是否已經綁定了監聽器

    // socket.on("admin-status", (isAdmin) => {
    //   if (isAdmin && !hasJoinRequestListener) {
    //     hasJoinRequestListener = true; // 設置標誌為 true，表示已經綁定了監聽器
    //     socket.on("user-join-request", ({ socketId, userId, roomId }) => {
    //       const allowed = window.confirm(
    //         `User ${userId} requests to join the room. Allow?`
    //       );
    //       if (allowed) {
    //         socket.emit("admin-approve-user", { socketId });
    //       } else {
    //         socket.emit("admin-reject-user", { socketId });
    //       }
    //     });
    //   }
    // });

    // socket.on("join-approved", async (roomId) => {
    //   console.log("You have been approved to join the room.");
    //   // 可以继续处理加入房间的逻辑
    //   const joinUserRoomResponse = await fetch(`/api/mainRoom/${roomId}`, {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       Authorization: `Bearer ${token}`,
    //     },
    //     body: JSON.stringify({ userInfo: payload.payload }),
    //   });

    //   if (!joinUserRoomResponse.ok) {
    //     throw new Error("Failed to join room");
    //   }
    //   console.log("Join room response:", joinUserRoomResponse);
    // });

    // socket.on("join-rejected", () => {
    //   alert("You were not allowed to join the room.");
    //   window.location.href = "/";
    // });

    // 監聽 groups-finished 事件
    socket.on("groups-finished", (data) => {
      console.log("Groups finished:", data);
      handleFinishGrouping(data);
    });
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
  myPeerId,
};
