import { checkStatus } from "../utils/loginOutAndRegister.js";
import { MainRoom } from "../utils/mainRoomClass.js";
import { convertCanvasToStream } from "./backgroundEffects.js";

// 獲取房間 ID
const pathSegments = window.location.pathname.split("/");
const roomId = pathSegments[pathSegments.length - 1];
document.getElementById("currentRoomId").textContent = roomId;

// 建立 Socket.io 以及 Peer.js 連接
let peerInstance = null;
const socket =
  window.location.protocol == "https:"
    ? io("https://www.connectnow.website")
    : io("http://localhost:8080");

socket.on("connect", () => {
  console.log("Connected to server");
});

export const getPeer =
  window.location.protocol == "https:"
    ? function () {
        if (!peerInstance) {
          peerInstance = new Peer(undefined, {
            host: "peer-server.connectnow.website",
            port: 443,
            path: "/myapp",
            secure: true,
          });

          // 錯誤處理
          peerInstance.on("error", (err) => {
            console.error("PeerJS Error (HTTPS):", err);
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

          // 錯誤處理
          peerInstance.on("error", (err) => {
            console.error("PeerJS Error (HTTP):", err);
          });
        }
        return peerInstance;
      };

let mainRoom;
let currentRoom;
let localStream;
let currentStream;
let myPeerId;
let myUserId;

// mutation observer of local-stream

function waitForLocalStream() {
  return new Promise((resolve) => {
    // 監控父元素（假設父元素是 .container）
    const container = document.querySelector(".video-stream");

    // 創建一個 MutationObserver 實例
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (
              node.nodeType === Node.ELEMENT_NODE &&
              node.matches(".local-stream")
            ) {
              // 當發現有新的 .local-stream 節點被加入時
              // 找到目標後停止觀察，先不停止觀察！！！！
              observer.disconnect();
              resolve(node); // 將 .local-stream 元素回傳，並繼續往下執行
            }
          });
        }
      }
    });

    // 設定要觀察的選項
    const config = { childList: true, subtree: true };

    // 開始監控
    observer.observe(container, config);
  });
}

//

function initializeMainRoom() {
  mainRoom = new MainRoom(roomId);
  currentRoom = mainRoom;
}

// main function
(async function () {
  try {
    const payload = await checkStatus();
    console.log("Payload received:", payload);
    if (!payload) {
      localStorage.clear();
      window.location.href = "/";
      return;
    }

    const currentUrl = window.location.href;
    mainRoom = currentUrl.substring(currentUrl.lastIndexOf("/") + 1);
    localStorage.setItem("mainRoom", mainRoom);

    initializeMainRoom();
    console.log("mainRoom: ", mainRoom, "currentRoom: ", currentRoom);
    const localStreamCanvas = await waitForLocalStream();
    console.log(".local-stream element is ready");

    localStream = await convertCanvasToStream(localStreamCanvas);
    currentStream = localStream;
    console.log("currentStream: ", currentStream, "localStream: ", localStream);

    const peer = getPeer();
    peerInstance = peer;

    peer.on("open", (peerId) => {
      console.log("My peer ID is: " + peerId);
      myPeerId = peerId;
      const userId = payload.payload.userId;
      myUserId = userId;
      console.log(
        "Joining room with userId:",
        userId,
        "peerId:",
        peerId,
        "roomId:",
        roomId
      );

      if (userId && peerId) {
        console.log("Emitting join-room event");
        socket.emit("join-main-room", roomId, peerId, userId);
      } else {
        console.error("userId or peerId is undefined");
      }

      peer.on("call", (call) => {
        handleIncomingCall(call, currentStream);
      });
    });

    // handle incoming call
    function handleIncomingCall(call, stream) {
      call.answer(stream); // Answer with your stream
      call.on("stream", (userVideoStream) => {
        updateRemoteVideos(call.peer, userVideoStream);
      });
      // 監聽使用者離開事件，移除對應的 video 元素
      call.on("close", () => {
        removeVideoElement(call.peer);
      });
    }
  } catch (error) {
    console.error(error);
  }
})();

// mic mute toggle
let isMicMuted = false;

document.querySelector(".mic-icon > i").addEventListener("click", async () => {
  console.log("roomId, myPeerId, myUserId: ", roomId, myPeerId, myUserId);
  isMicMuted = !isMicMuted;
  const canvasElement = document.querySelector(".local-stream");
  // Update the stream with the new mic status
  localStream.getAudioTracks()[0].enabled = !isMicMuted;
  currentStream = localStream;
  // 重新連接所有使用者
  socket.emit("toggle-mic-status", roomId, myPeerId, myUserId, isMicMuted);

  // 更新所有參與者的 usersPanel-mic 圖示
  socket.emit("sync-mic-icons", {
    roomId,
    userId: myUserId,
    isMuted: isMicMuted,
  });

  // Optionally update the UI to show mic status (muted/unmuted)
  document.querySelector(".mic-icon > i").className = isMicMuted
    ? "fas fa-microphone-slash"
    : "fas fa-microphone";

  document.querySelector(".mic-icon").className = isMicMuted
    ? "mic-icon mic-mute"
    : "mic-icon";
});

// mute video toggle

// switch video

function updateLocalStream(updatedStream) {
  const videoTrack = updatedStream.getVideoTracks()[0];
  const videoElement = document.createElement("video");
  videoElement.srcObject = new MediaStream([videoTrack]);

  videoElement.onloadedmetadata = () => {
    videoElement.play();
    const canvas = document.querySelector(".local-stream"); // 你的 canvas 元素
    const context = canvas.getContext("2d");

    function drawFrame() {
      context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      requestAnimationFrame(drawFrame);
    }

    drawFrame();
  };
}

async function updateVideoSource(newVideoDeviceId) {
  try {
    // 取得現有音訊流
    const currentAudioTracks = localStream.getAudioTracks();

    // 使用新的 videoDeviceId 取得新的視訊流
    const newVideoStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: newVideoDeviceId } },
      audio: false, // 不需要更新音訊流
    });

    // 保留現有的音訊流，並結合新的視訊流
    const updatedStream = new MediaStream([
      ...currentAudioTracks,
      ...newVideoStream.getVideoTracks(),
    ]);

    // 在本地 canvas 或 video 上更新流
    updateLocalStream(updatedStream);

    // 通知其他參與者視訊流已更新
    socket.emit("update-video-stream", roomId, myPeerId, myUserId);
  } catch (error) {
    console.error("Failed to update video source:", error);
  }
}
document.querySelector(".video-list").addEventListener("change", (event) => {
  document.querySelector(".video-list").classList.add("hidden");
  console.log("video value: ", event.target.value);
  const newVideoDeviceId = event.target.value;
  updateVideoSource(newVideoDeviceId);
});

// switch audio
function updateCanvasStream(stream) {
  const videoTrack = stream.getVideoTracks()[0];
  const videoElement = document.createElement("video");
  videoElement.srcObject = new MediaStream([videoTrack]);

  videoElement.onloadedmetadata = () => {
    videoElement.play();
    const canvas = document.querySelector(".local-stream"); // 你的 canvas 元素
    const context = canvas.getContext("2d");

    function drawFrame() {
      if (!isVideoMuted) {
        // 當視訊開啟時，繪製視訊內容
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      } else {
        // 當視訊關閉時，填充黑色背景
        context.fillStyle = "black";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      requestAnimationFrame(drawFrame);
    }

    drawFrame();
  };
}

async function updateAudioSource(newAudioDeviceId) {
  try {
    // 获取现有的 canvas stream 视频轨道
    const currentVideoTracks = localStream.getVideoTracks();

    // 使用新的 audioDeviceId 获取新的音频流
    const newAudioStream = await navigator.mediaDevices.getUserMedia({
      video: false, // 不需要更新视频流
      audio: { deviceId: { exact: newAudioDeviceId } },
    });

    // 将现有的视频轨道和新的音频轨道组合成一个新的 MediaStream
    const updatedStream = new MediaStream([
      ...currentVideoTracks,
      ...newAudioStream.getAudioTracks(),
    ]);

    // 更新 canvas stream，使其包含新的音频轨道
    localStream = updatedStream;
    currentStream = localStream;

    // 继续使用 localStream 在 canvas 上绘制视频内容
    updateCanvasStream(localStream);

    // 通知其他参与者音频流已更新
    socket.emit("update-audio-source", roomId, myPeerId, myUserId);
  } catch (error) {
    console.error("Failed to update audio source:", error);
  }
}
// 當使用者切換裝置時調用該方法
document.querySelector(".mic-list").addEventListener("change", (event) => {
  document.querySelector(".mic-list").classList.add("hidden");
  console.log("mic value: ", event.target.value);
  const newAudioDeviceId = event.target.value;
  updateAudioSource(newAudioDeviceId);
});

// toggle mic and video list

const chooseMic = document.querySelector(".choose-mic");
const chooseVideo = document.querySelector(".choose-video");
chooseMic.addEventListener("click", toggleMicList);
chooseVideo.addEventListener("click", toggleVideoList);
let isMicListActive = false; // 变量来跟踪 listMic 是否处于活动状态
let isVideoListActive = false;
const micList = document.querySelector(".mic-list");
const videoList = document.querySelector(".video-list");

const devices = await navigator.mediaDevices.enumerateDevices();
function listMicVideo() {
  micList.innerHTML = ""; // 清空之前的列表
  videoList.innerHTML = ""; // 清空之前的列表

  devices.forEach((device) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.text = device.label;
    if (device.kind === "audioinput") {
      micList.appendChild(option);
    } else if (device.kind === "videoinput") {
      videoList.appendChild(option);
    }
  });
}

listMicVideo();

function toggleMicList() {
  if (isMicListActive) {
    micList.classList.add("hidden");
  } else {
    micList.classList.remove("hidden");
  }
  isMicListActive = !isMicListActive; // 切换状态
}

function toggleVideoList() {
  if (isVideoListActive) {
    videoList.classList.add("hidden");
  } else {
    videoList.classList.remove("hidden");
  }
  isVideoListActive = !isVideoListActive; // 切换状态
}

// 關閉視訊
let isVideoMuted = false;
document
  .querySelector(".video-icon > i")
  .addEventListener("click", async () => {
    console.log("Toggling video status...");
    isVideoMuted = !isVideoMuted;

    if (isVideoMuted) {
      // 關閉視訊，並顯示黑畫面
      localStream.getVideoTracks()[0].enabled = false;
      updateCanvasStream(localStream); // 更新畫布為黑色
    } else {
      // 重新擷取視訊流
      const newVideoStream = await navigator.mediaDevices.getUserMedia({
        video: true, // 重新取得視訊流
        audio: false,
      });

      // 保留現有的音訊軌道，並結合新的視訊流
      const updatedStream = new MediaStream([
        ...localStream.getAudioTracks(),
        ...newVideoStream.getVideoTracks(),
      ]);

      localStream = updatedStream;
      currentStream = localStream;
      updateCanvasStream(localStream); // 更新畫布為新視訊內容

      // 通知其他參與者視訊流已更新
      socket.emit(
        "toggle-video-status",
        roomId,
        myPeerId,
        myUserId,
        isVideoMuted
      );
    }

    // 更新 UI 的圖示
    document.querySelector(".video-icon > i").className = isVideoMuted
      ? "fas fa-video-slash"
      : "fas fa-video";

    document.querySelector(".video-icon").className = isVideoMuted
      ? "video-icon video-muted"
      : "video-icon";
  });
// socket listener

function updateRemoteVideos(peerId, userVideoStream) {
  // 检查页面上是否已经有这个用户的视频元素
  let videoElement = document.querySelector(`video[data-peer-id="${peerId}"]`);

  if (!videoElement) {
    // 如果还没有该用户的视频元素，则创建一个新的
    videoElement = document.createElement("video");
    videoElement.setAttribute("data-peer-id", peerId); // 设置 data-peer-id 属性
    videoElement.autoplay = true;
    videoElement.playsInline = true;

    // 可选：如果你希望远程视频静音，可以设置 muted
    videoElement.muted = false; // 远程视频通常不需要静音

    // 将新创建的视频元素插入到指定的容器中
    const videoContainer = document.querySelector(".video-stream"); // 假设你有一个视频容器
    videoContainer.appendChild(videoElement);
  }

  // 将新的视频流赋值给视频元素
  videoElement.srcObject = userVideoStream;

  // 处理播放错误
  videoElement.addEventListener("loadedmetadata", () => {
    videoElement.play().catch((error) => {
      console.error("Error playing video stream: ", error);
    });
  });
}

// 添加 connectToNewUser 函数，用于呼叫新连接的用户
function connectToNewUser(peerId, stream) {
  const call = peerInstance.call(peerId, stream);

  call.on("stream", (userVideoStream) => {
    updateRemoteVideos(peerId, userVideoStream); // 更新视频流
  });

  call.on("close", () => {
    // 清理关闭后的资源
    console.log(`Call with ${peerId} ended`);
    removeVideoElement(call.peer);
  });
}

socket.on("user-connected-mainRoom", (peerId, userId) => {
  console.log("New user connected to room:", peerId, userId);
  connectToNewUser(peerId, currentStream);
});

// leave event
// 移除對應的 video 元素
function removeVideoElement(peerId) {
  const videoElement = document.querySelector(
    `video[data-peer-id="${peerId}"]`
  );
  if (videoElement) {
    videoElement.remove();
  }
}

// 當有使用者離開時移除其 video 元素
socket.on("user-disconnected-mainRoom", (peerId, userId) => {
  console.log("User disconnected from room:", peerId, userId);
  removeVideoElement(peerId);
});

// mute mic toggle
socket.on("user-mic-status-changed", (peerId, isMicMuted) => {
  const videoElement = document.querySelector(
    `video[data-peer-id="${peerId}"]`
  );
  if (videoElement) {
    videoElement.muted = isMicMuted;
  }
});

// toggle mic by users panel
socket.on("user-mic-status-changed-by-usersPanel", ({ userId, isMuted }) => {
  const micButton = document.querySelector(
    `.usersPanel-mic[data-user-id="${userId}"]`
  );
  if (micButton) {
    const micIcon = micButton.querySelector("i");
    micIcon.classList.toggle("fa-microphone", !isMuted);
    micIcon.classList.toggle("fa-microphone-slash", isMuted);
  }

  // // 同步音訊狀態
  // const videoElement = document.querySelector(
  //   `video[data-user-id="${userId}"]`
  // );
  // if (videoElement) {
  //   videoElement.muted = isMuted;
  // }

  if (userId == localStorage.getItem("userId")) {
    const userMic = document.querySelector(
      `.mic-icon[data-user-id="${userId}"] > i`
    );
    userMic.click();
  }
});

// mic video list change
socket.on("update-video-stream", (roomId, peerId, userId) => {
  console.log(`${userId} switched their media source, Updating...`);
  if (peerId !== myPeerId) {
    connectToNewUser(peerId, currentStream); // 重新連接，使用更新後的流
  }
});

socket.on("user-audio-source-updated", (peerId, userId) => {
  console.log(`User ${userId} updated their audio source. Updating...`);
  if (peerId !== myPeerId) {
    connectToNewUser(peerId, currentStream); // 重新連接，使用更新後的流
  }
});

// 關閉視訊
socket.on("toggle-video-status", (peerId, isVideoMuted) => {
  const videoElement = document.querySelector(
    `video[data-peer-id="${peerId}"]`
  );
  if (videoElement) {
    if (isVideoMuted) {
      // 顯示黑畫面
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;

      context.fillStyle = "black";
      context.fillRect(0, 0, canvas.width, canvas.height);

      videoElement.srcObject = canvas.captureStream();
    } else {
      // 恢復播放視訊
      if (peerId !== myPeerId) {
        connectToNewUser(peerId, currentStream); // 重新連接，使用更新後的流
      }
    }
  }
});

export { connectToNewUser, socket, roomId };
