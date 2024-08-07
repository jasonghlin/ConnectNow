// 導入必要的模組
import { handleMicList } from "./userInputOutput.js";
import {
  shareScreen,
  shareMediaStream,
  resetShareMediaStream,
} from "./shareScreen.js";
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
} from "./groupHandler.js";

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
// const socket = io("https://www.connectnow.website");
const videoStreamDiv = document.querySelector(".video-stream");
const peers = {};

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

  // 添加對等連接
  addPeer(peerId, peer) {
    this.peers.set(peerId, peer);
  }

  // 移除對等連接
  removePeer(peerId) {
    this.peers.delete(peerId);
  }

  // 創建分組房間
  createBreakoutRoom(breakoutRoomId) {
    const breakoutRoom = new BreakoutRoom(breakoutRoomId, this);
    this.breakoutRooms.set(breakoutRoomId, breakoutRoom);
    return breakoutRoom;
  }

  // 結束所有分組房間
  endBreakoutRooms() {
    this.breakoutRooms.forEach((room) => room.end());
    this.breakoutRooms.clear();
  }
}

let mainRoom;
let currentRoom;

// 初始化主房間
function initializeMainRoom() {
  mainRoom = new MainRoom(roomId);
  currentRoom = mainRoom;
}

// // 添加視訊流到 DOM
const addVideoStream = (video, stream, userId) => {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  video.setAttribute("data-user-id", userId);
  if (!videoStreamDiv.contains(video)) {
    videoStreamDiv.append(video);
    updateVideoLayout(); // Add this line
  }
};

// 切換視訊流
const switchStream = (newStream, isScreenShare = false) => {
  currentStream = newStream;

  // 更新本地视频
  const myVideo = document.querySelector(".local-stream");
  if (myVideo) {
    myVideo.srcObject = newStream;
    if (isScreenShare) {
      myVideo.classList.remove("invert-screen");
    } else {
      myVideo.classList.add("invert-screen");
    }
  }

  // 更新所有連接用户的视频流
  for (let userId in peers) {
    const sender = peers[userId].peerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    if (sender) {
      sender
        .replaceTrack(newStream.getVideoTracks()[0])
        .then(() => {
          console.log("Stream replaced successfully");
          // 通知其他用户切换流
          socket.emit("update-stream", userId, newStream.id, isScreenShare);
        })
        .catch((error) => {
          console.error("Error replacing stream:", error);
        });
    }
  }
};

// 切換視訊開關
const toggleVideo = () => {
  videoEnabled = !videoEnabled;
  localStream.getVideoTracks()[0].enabled = videoEnabled;

  // 通知其他用戶視訊狀態變化
  for (let userId in peers) {
    const sender = peers[userId].peerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    if (sender) {
      sender.track.enabled = videoEnabled;
    }
  }

  // 如果視頻被禁用，停止當前視頻流
  if (!videoEnabled) {
    const blackStream = localStream.clone();
    blackStream.getVideoTracks()[0].enabled = false;
    switchStream(blackStream);
  } else {
    switchStream(localStream);
  }
};

// 渲染遠程視訊
const renderRemoteVideos = () => {
  remoteVideos.forEach((video, userId) => {
    if (!videoStreamDiv.contains(video)) {
      videoStreamDiv.appendChild(video);
    }
  });
  updateVideoLayout();
};

// 更新遠程視訊
const updateRemoteVideos = (userId, stream, isScreenShare = false) => {
  if (remoteVideos.has(userId)) {
    // 更新現有視頻
    const existingVideo = remoteVideos.get(userId);
    existingVideo.srcObject = stream;
    if (isScreenShare) {
      existingVideo.classList.remove("invert-screen");
    } else {
      existingVideo.classList.add("invert-screen");
    }
  } else {
    // 添加新視頻
    const userVideo = document.createElement("video");
    userVideo.autoplay = true;
    userVideo.playsInline = true;
    if (!isScreenShare) {
      userVideo.classList.add("invert-screen");
    }
    userVideo.setAttribute("data-user-id", userId);
    addVideoStream(userVideo, stream, userId);
    remoteVideos.set(userId, userVideo);
  }
  renderRemoteVideos();
};

// 移除遠程視訊
// 断开连接时移除远程视频
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

// 初始化用户面板事件监听器
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

// 新增一個函數來更新用戶列表
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

// 主函數
(async function () {
  try {
    const payload = await checkStatus();
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

    // let peer;
    // peer = new Peer(undefined, {
    //   // host: "localhost",
    //   host: "www.pharmengineer.cloudns.be",
    //   port: 443,
    //   secure: true,
    //   path: "/myapp",
    // });

    const peer = getPeer();

    peer.on("open", (id) => {
      console.log("My peer ID is: " + id);
      socket.emit("join-room", roomId, id);
      mainRoom.addPeer(id, peer);
    });

    peer.on("call", handleIncomingCall);

    // peer.on("call", (call) => {
    //   call.answer(currentStream);
    //   const userVideo = document.createElement("video");
    //   call.on("stream", (userVideoStream) => {
    //     updateRemoteVideos(call.peer, userVideoStream);
    //   });

    //   call.on("close", () => {
    //     removeRemoteVideo(call.peer);
    //   });
    //   currentRoom.addPeer(call.peer, call);
    // });

    const connectToNewUser = (userId, stream) => {
      const call = peer.call(userId, stream);
      call.on("stream", (userVideoStream) => {
        console.log("Remote stream received:", userVideoStream.getTracks());
        updateRemoteVideos(userId, userVideoStream);
      });
      call.on("close", () => {
        removeRemoteVideo(userId);
      });

      peers[userId] = call;
    };

    socket.on("user-connected", (peerId, userId) => {
      console.log("New user connected:", userId);
      connectToNewUser(peerId, currentStream);
      updateUsersList();
      handleUserConnected();
    });

    socket.on("user-disconnected", (peerId, userId) => {
      console.log("User disconnected:", userId);
      if (peers[peerId]) peers[peerId].close();
      removeRemoteVideo(userId);
      handleUserDisconnected(userId);
    });

    socket.on("remove-duplicate", (oldPeerId) => {
      console.log("Removing duplicate connection:", oldPeerId);
      if (peers[oldPeerId]) {
        peers[oldPeerId].close();
        delete peers[oldPeerId];
      }
      removeRemoteVideo(oldPeerId);
    });

    socket.on("update-remote-videos", (updatedRemoteVideos) => {
      remoteVideos = updatedRemoteVideos.map(({ userId }) => ({
        userId,
        video: document.createElement("video"),
      }));
      renderRemoteVideos();
    });

    socket.on("update-stream", (userId, streamId, isScreenShare) => {
      const peer = peers[userId];
      if (peer) {
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: true })
          .then((newStream) => {
            const videoTrack = newStream
              .getVideoTracks()
              .find((track) => track.id === streamId);
            if (videoTrack) {
              const stream = new MediaStream([
                videoTrack,
                ...newStream.getAudioTracks(),
              ]);
              updateRemoteVideos(userId, stream, isScreenShare);
            }
          })
          .catch((err) => {
            console.error("Error getting new stream for update:", err);
          });
      }
    });

    renderRemoteVideos();
    window.addEventListener("beforeunload", leaveRoom);
  } catch (err) {
    console.error("Error getting user media:", err);
  }
})();

// 事件監聽器：創建分組房間
// document
//   .querySelector(".create-breakout-rooms")
//   .addEventListener("click", () => {
//     const numberOfRooms = parseInt(
//       prompt("Enter the number of breakout rooms:")
//     );
//     if (numberOfRooms > 0) {
//       createBreakoutRooms(numberOfRooms);
//     }
//   });

// 事件監聽器：結束分組討論
// document.querySelector(".end-breakout-rooms").addEventListener("click", () => {
//   mainRoom.endBreakoutRooms();
// });

// 事件監聽器：分享螢幕
document.querySelector(".share-screen").addEventListener("click", async (e) => {
  try {
    const screenStream = await shareScreen();
    switchStream(screenStream, true);

    // 當分享結束時恢復本地視訊流
    screenStream.getVideoTracks()[0].addEventListener("ended", () => {
      switchStream(localStream);
      resetShareMediaStream();

      // 恢复所有视频的 .invert-screen 样式
      const allVideos = document.querySelectorAll("video");
      allVideos.forEach((video) => {
        if (video.classList.contains("local-stream")) {
          video.classList.add("invert-screen");
        } else {
          video.classList.remove("invert-screen");
        }
      });
    });
  } catch (err) {
    console.error("Error sharing screen or user cancelled:", err);
    // 如果分享取消，恢復原本的視訊流
    switchStream(localStream);
  }
});

// 事件監聽器：切換視訊
document.querySelector(".video").addEventListener("click", toggleVideo);

export { socket, updateUsersList, updateRemoteVideos, removeRemoteVideo };
