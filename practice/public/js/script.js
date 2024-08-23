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

  // Optionally update the UI to show mic status (muted/unmuted)
  document.querySelector(".mic-icon > i").className = isMicMuted
    ? "fas fa-microphone-slash"
    : "fas fa-microphone";

  document.querySelector(".mic-icon").className = isMicMuted
    ? "mic-icon mic-mute"
    : "mic-icon";
});

// mute video toggle

// switch mic and video
// 這個方法處理裝置的切換，並通知其他使用者
function reconnectToAllUsers() {
  const connectedPeers = peerInstance.connections;
  for (let peerId in connectedPeers) {
    connectToNewUser(peerId, currentStream); // 使用更新後的流
  }
}

async function switchMediaSource(newAudioDeviceId, newVideoDeviceId) {
  try {
    // 取得新的媒體流
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: newVideoDeviceId ? { exact: newVideoDeviceId } : undefined,
      },
      audio: {
        deviceId: newAudioDeviceId ? { exact: newAudioDeviceId } : undefined,
      },
    });

    // 使用新的視頻流畫到 canvas 上
    const canvasElement = document.querySelector(".local-stream");
    const canvasCtx = canvasElement.getContext("2d");

    const videoTrack = newStream.getVideoTracks()[0];
    const videoElement = document.createElement("video");
    videoElement.srcObject = newStream;
    videoElement.play();

    videoElement.addEventListener("loadedmetadata", () => {
      // 設定 canvas 尺寸與新的視頻尺寸一致
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;

      // 持續將視頻畫到 canvas 上
      function drawToCanvas() {
        canvasCtx.drawImage(
          videoElement,
          0,
          0,
          canvasElement.width,
          canvasElement.height
        );
        requestAnimationFrame(drawToCanvas); // 持續更新畫面
      }
      drawToCanvas();

      // 將 Canvas 轉換為 MediaStream
      localStream = convertCanvasToStream(canvasElement);
      currentStream = localStream;

      // 通知其他使用者
      socket.emit("update-stream", roomId, myPeerId, myUserId);

      // 重新連接所有使用者
      reconnectToAllUsers();
    });
  } catch (error) {
    console.error("Error switching media source:", error);
  }
}

// 當使用者切換裝置時調用該方法
document.querySelector(".mic-list").addEventListener("change", (event) => {
  document.querySelector(".mic-list").classList.add("hidden");
  console.log("mic value: ", event.target.value);
  const newAudioDeviceId = event.target.value;
  const currentVideoDeviceId = document.querySelector(".video-list").value;
  switchMediaSource(newAudioDeviceId, currentVideoDeviceId);
});

document.querySelector(".video-list").addEventListener("change", (event) => {
  document.querySelector(".video-list").classList.add("hidden");
  console.log("video value: ", event.target.value);
  const newVideoDeviceId = event.target.value;
  const currentAudioDeviceId = document.querySelector(".mic-list").value;
  switchMediaSource(currentAudioDeviceId, newVideoDeviceId);
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

// mic video list change
socket.on("update-stream", (roomId, peerId, userId) => {
  console.log(`${userId} switched their media source`);
  if (peerId !== myPeerId) {
    connectToNewUser(peerId, currentStream); // 重新連接，使用更新後的流
  }
});

export { connectToNewUser };
