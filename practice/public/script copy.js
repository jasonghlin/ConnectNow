import { handleMicList } from "./userInputOutput.js";
import {
  shareScreen,
  shareMediaStream,
  resetShareMediaStream,
} from "./shareScreen.js";

let localStream = null;
let currentStream = null; // 用於追蹤當前的流（視訊或螢幕）
let videoEnabled = true; // 用於追蹤視訊狀態
let remoteVideos = [];
let isScreenSharing = false; // 用於追蹤是否在分享螢幕

const urlParams = new URLSearchParams(window.location.search);
const pathSegments = window.location.pathname.split("/");
const roomId = pathSegments[pathSegments.length - 1];
document.getElementById("currentRoomId").textContent = roomId;

const socket = io("http://localhost:8080");
const videoStreamDiv = document.querySelector(".video-stream");
const peers = {};

const addVideoStream = (video, stream) => {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  if (!videoStreamDiv.contains(video)) {
    videoStreamDiv.append(video);
  }
};

const switchStream = (newStream, isScreenShare = false) => {
  currentStream = newStream;

  // 更新本地視頻
  const myVideo = document.querySelector(".local-stream");
  myVideo.srcObject = newStream;

  // 更新所有連接用戶的視訊流
  for (let userId in peers) {
    const sender = peers[userId].peerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    if (sender) {
      sender
        .replaceTrack(newStream.getVideoTracks()[0])
        .then(() => {
          console.log("Stream replaced successfully");
        })
        .catch((error) => {
          console.error("Error replacing stream:", error);
        });
    }
  }

  // 通知其他用戶切換流
  socket.emit("update-stream", newStream.id, isScreenShare);

  // 根據是否螢幕分享動態添加或移除 .invert-screen 樣式
  const allVideos = document.querySelectorAll("video");
  allVideos.forEach((video) => {
    if (isScreenShare) {
      video.classList.remove("invert-screen");
    } else {
      video.classList.add("invert-screen");
    }
  });
};

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

  // 如果視頻被禁用，停止当前视频流
  if (!videoEnabled) {
    const blackStream = localStream.clone();
    blackStream.getVideoTracks()[0].enabled = false;
    switchStream(blackStream);
  } else {
    switchStream(localStream);
  }
};

const renderRemoteVideos = () => {
  remoteVideos.forEach(({ userId, video }) => {
    if (!videoStreamDiv.contains(video)) {
      videoStreamDiv.append(video);
    }
  });
};

const updateRemoteVideos = (userId, stream) => {
  if (remoteVideos.some((video) => video.userId === userId)) {
    // 使用者已存在，更新其視訊流
    remoteVideos = remoteVideos.map((video) =>
      video.userId === userId ? { userId, video: video.video } : video
    );
  } else {
    // 新使用者，新增其視訊
    const userVideo = document.createElement("video");
    userVideo.classList.add("invert-screen"); // 初始化為鏡像顯示
    remoteVideos.push({ userId, video: userVideo });
    addVideoStream(userVideo, stream);
  }
  renderRemoteVideos();
};

const removeRemoteVideo = (userId) => {
  const videoIndex = remoteVideos.findIndex((video) => video.userId === userId);
  if (videoIndex !== -1) {
    const videoElement = remoteVideos[videoIndex].video;
    if (videoStreamDiv.contains(videoElement)) {
      videoStreamDiv.removeChild(videoElement);
    }
    remoteVideos.splice(videoIndex, 1);
  }
};

(async function () {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localStream = stream;
    currentStream = stream;

    handleMicList(peers, localStream, switchStream); // 傳遞 switchStream 函數以供切換

    const myVideo = document.createElement("video");
    myVideo.classList.add("local-stream");
    myVideo.classList.add("invert-screen"); // 初始化為鏡像顯示
    myVideo.muted = true; // 确保本地视频静音，以避免回声
    if (!document.querySelector(".local-stream")) {
      addVideoStream(myVideo, stream);
    }

    const peer = new Peer(undefined, {
      host: "localhost",
      port: 9001,
      path: "/myapp",
    });

    peer.on("open", (id) => {
      console.log("My peer ID is: " + id);
      socket.emit("join-room", roomId, id);
    });

    peer.on("call", (call) => {
      call.answer(currentStream); // 確保新用戶獲得當前的視訊流
      const userVideo = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        updateRemoteVideos(call.peer, userVideoStream);
      });
      call.on("close", () => {
        removeRemoteVideo(call.peer);
      });
    });

    socket.on("user-connected", (userId) => {
      connectToNewUser(userId, currentStream); // 使用當前的視訊流連接新用戶
    });

    const connectToNewUser = (userId, stream) => {
      const call = peer.call(userId, stream);
      call.on("stream", (userVideoStream) => {
        updateRemoteVideos(userId, userVideoStream);
      });
      call.on("close", () => {
        removeRemoteVideo(userId);
      });

      peers[userId] = call;
    };

    socket.on("user-disconnected", (userId) => {
      if (peers[userId]) peers[userId].close();
      removeRemoteVideo(userId);
    });

    socket.on("update-remote-videos", (updatedRemoteVideos) => {
      remoteVideos = updatedRemoteVideos.map(({ userId }) => ({
        userId,
        video: document.createElement("video"),
      }));
      renderRemoteVideos();
    });

    socket.on("update-stream", (streamId, isScreenShare) => {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((newStream) => {
          const videoTrack = newStream
            .getVideoTracks()
            .find((track) => track.id === streamId);
          if (videoTrack) {
            switchStream(
              new MediaStream([videoTrack, ...newStream.getAudioTracks()]),
              isScreenShare
            );
          }
        });
    });

    renderRemoteVideos(); // 初始渲染本地視訊
  } catch (err) {
    console.error("Error getting user media:", err);
  }
})();

// share screen
document.querySelector(".share-screen").addEventListener("click", async (e) => {
  try {
    const screenStream = await shareScreen();
    switchStream(screenStream, true);

    // 當分享結束時恢復本地視訊流
    screenStream.getVideoTracks()[0].addEventListener("ended", () => {
      switchStream(localStream);
      resetShareMediaStream();
    });
  } catch (err) {
    console.error("Error sharing screen or user cancelled:", err);
    // 如果分享取消，恢復原本的視訊流
    switchStream(localStream);
  }
});

// toggle video
document.querySelector(".video").addEventListener("click", toggleVideo);
