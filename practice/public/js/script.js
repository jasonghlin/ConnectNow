import { checkStatus } from "../utils/loginOutAndRegister.js";
import { MainRoom } from "../utils/MainRoomClass.js";
import { convertCanvasToStream } from "./backgroundEffects.js";
import {
  startScreenShare,
  stopScreenShare,
  handleIncomingScreenShare,
} from "./shareScreen.js";
import { updateVideoLayout } from "./videoLayout.js";
import { initializeSegmenter } from "./backgroundEffects.js";

// 獲取房間 ID
const pathSegments = window.location.pathname.split("/");
const roomId = pathSegments[pathSegments.length - 1];
document.getElementById("currentRoomId").textContent = roomId;

// 建立 Socket.io 以及 Peer.js 連接
let peerInstance = null;
const socket =
  window.location.protocol == "https:"
    ? io("https://www.connectnow.website", {
        auth: {
          token: localStorage.getItem("session"),
        },
      })
    : io("http://localhost:8080", {
        auth: {
          token: localStorage.getItem("session"),
        },
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

function updateCurrentRoom(newRoom) {
  currentRoom = newRoom;
}

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

    let userId = payload.payload.userId;

    let currentUrl = window.location.href;
    let roomUrl = currentUrl.substring(currentUrl.lastIndexOf("/") + 1);
    if (!roomUrl.startsWith("breakout-")) {
      mainRoom = roomUrl;
    }
    localStorage.setItem("mainRoom", mainRoom);

    socket.on("connect", () => {
      console.log("Connected to server");
      socket.emit("connect-to-server", userId, mainRoom);
    });

    socket.on("connect_error", (err) => {
      console.error("Connection Error:", err.message);
      alert("Connection Error: " + err.message);
    });
    initializeMainRoom();
    console.log("mainRoom: ", mainRoom, "currentRoom: ", currentRoom);
    const localStreamCanvas = await waitForLocalStream();
    console.log(".local-stream element is ready");

    localStream = await convertCanvasToStream(localStreamCanvas);
    currentStream = localStream;
    console.log("currentStream: ", currentStream, "localStream: ", localStream);

    const peer = getPeer();
    peerInstance = peer;

    peer.on("open", async (peerId) => {
      console.log("My peer ID is: " + peerId);
      myPeerId = peerId;
      userId = payload.payload.userId;
      myUserId = userId;
      console.log(
        "Joining room with userId:",
        userId,
        "peerId:",
        peerId,
        "roomId:",
        roomId
      );

      currentUrl = window.location.href;
      roomUrl = currentUrl.substring(currentUrl.lastIndexOf("/") + 1);
      console.log("roomUrl: ", roomUrl);
      const roomAdminResponse = await fetch(`/api/roomAdmin/${roomId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("session")}`,
        },
      });
      const roomAdmin = await roomAdminResponse.json();
      const roomAdminId = roomAdmin[0].admin_user_id;
      const usersResponse = await fetch("/api/allUsers", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("session")}`,
        },
      });
      const usersList = await usersResponse.json();
      console.log(usersList);

      if (userId && peerId && !roomUrl.startsWith("breakout-")) {
        if (!roomAdminId || payload.payload.userId == roomAdminId) {
          console.log("Emitting join-room event");
          socket.emit(
            "join-main-room",
            roomId,
            peerId,
            userId,
            payload.payload
          );
          socket.on("user-join-request", (payload, roomId) => {
            console.log("有人想加入房間");
            let joinRequestConfirm = confirm(
              ` ${payload.payload.userName} 想加入此會議`
            );
            if (!joinRequestConfirm) {
              socket.emit("reject-join-request", roomId);
            } else {
              socket.emit("accept-join-request", roomId);
            }
          });
        } else if (
          usersList.some((user) => user.id == payload.payload.userId)
        ) {
          console.log("Emitting join-room event");
          socket.emit(
            "join-main-room",
            roomId,
            peerId,
            userId,
            payload.payload
          );
        } else if (userId && peerId && payload.payload.userId != roomAdminId) {
          socket.emit("user-join-request", payload, roomId);
          socket.on("accept-join-request", (response) => {
            if (response.accept) {
              console.log("Emitting join-room event");
              socket.emit(
                "join-main-room",
                roomId,
                peerId,
                userId,
                payload.payload
              );
            }
            socket.off("accept-join-request").off("reject-join-request");
          });

          socket.on("reject-join-request", (response) => {
            if (response.reject) {
              Swal.fire("你被拒絕加入房間");
              socket.off("accept-join-request").off("reject-join-request");
              window.location.href = "/";
            }
          });
        }
      } else {
        let breakoutRoomId = roomUrl;
        console.log(userId, peerId, myUserId, myPeerId);
        socket.emit("join-breakout-room", breakoutRoomId, myPeerId, userId);
      }

      peer.on("call", (call) => {
        if (call.metadata && call.metadata.type === "screenShare") {
          handleIncomingScreenShare(call);
        } else {
          handleIncomingCall(call, currentStream);
        }
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
    initializeSegmenter();
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
    // 使用新的 audioDeviceId 获取新的音频流
    const updatedStream = await navigator.mediaDevices.getUserMedia({
      video: true, // 不需要更新视频流
      audio: { deviceId: { exact: newAudioDeviceId } },
    });

    // 更新 canvas stream，使其包含新的音频轨道
    localStream = updatedStream;
    currentStream = localStream;

    // 继续使用 localStream 在 canvas 上绘制视频内容
    updateCanvasStream(localStream);
    initializeSegmenter();
    const canvasElementStream = document
      .querySelector(".local-stream")
      .captureStream();
    currentStream = new MediaStream([
      ...updatedStream.getAudioTracks(),
      ...canvasElementStream.getVideoTracks(),
    ]);
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
      initializeSegmenter();
      updateCanvasStream(localStream); // 更新畫布為新視訊內容
      // 通知其他參與者視訊流已更新
      const canvasElementStream = document
        .querySelector(".local-stream")
        .captureStream();
      currentStream = new MediaStream([
        ...updatedStream.getAudioTracks(),
        ...canvasElementStream.getVideoTracks(),
      ]);
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
  updateVideoLayout();
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
    updateVideoLayout();
  }
}

// 當有使用者離開時移除其 video 元素
socket.on("user-disconnected-mainRoom", (peerId, userId) => {
  console.log("User disconnected from room:", peerId, userId);
  removeVideoElement(peerId);
});

window.addEventListener("beforeunload", (event) => {
  // 触发 disconnect 事件
  socket.emit("user-leaving");
  // 标准浏览器要求设置 returnValue 属性
  event.returnValue = "";
});

window.addEventListener("unload", (event) => {
  // 触发 disconnect 事件
  socket.emit("user-leaving");
  // 标准浏览器要求设置 returnValue 属性
  event.returnValue = "";
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
  console.log(userId, isMicMuted);
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
    console.log(userMic);
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

// connect to breakout room users
socket.on("user-connected-breakoutRoom", (peerId, userId) => {
  console.log("New user connected to breakout room:", peerId, userId);
  if (peerId !== myPeerId) {
    connectToNewUser(peerId, currentStream); // 使用更新後的流重新連接
  }
});

// return to main room
socket.on("return-to-main-room", (roomId) => {
  const newUrl = `${window.location.origin}/roomId/${roomId}`;
  // 斷開所有當前的 peer 連接
  peerInstance.disconnect();

  // 清除所有遠端視訊
  document
    .querySelectorAll("video:not(.local-stream)")
    .forEach((video) => video.remove());

  history.pushState(null, "", newUrl);
  // window.location.href = newUrl;
  // 使用舊的 peerId 重新連接
  peerInstance.reconnect(peerInstance.id);

  console.log("peerInstance.id: ", peerInstance.id);
  // 加入新的組
  socket.emit("rejoin-main-room", roomId, peerInstance.id, myUserId);
});

socket.on("rejoin-main-room", (peerId, userId) => {
  console.log("Rejoin room:", peerId, userId);
  if (peerId !== myPeerId) {
    connectToNewUser(peerId, currentStream); // 使用更新後的流重新連接
  }
});

// share screen
let isScreenSharing = false;

// Modify the screen share button event listener
document.querySelector(".share-screen").addEventListener("click", () => {
  if (!isScreenSharing) {
    startScreenShare();
    isScreenSharing = true;
    updateVideoLayout();
  } else {
    stopScreenShare();
    isScreenSharing = false;
  }
});

// Add new socket listeners for screen sharing events
socket.on("user-started-screen-share", (peerId) => {
  console.log(`User ${peerId} started screen sharing`);
});

socket.on("user-stopped-screen-share", (peerId) => {
  console.log(`User ${peerId} stopped screen sharing`);
  const screenShareVideo = document.querySelector(
    `video[video-share-peer-id="${peerId}"]`
  );
  if (screenShareVideo) {
    screenShareVideo.remove();
  }
  // Restore the original video for this peer
  const peerVideo = document.querySelector(`video[data-peer-id="${peerId}"]`);
  if (peerVideo) {
    peerVideo.style.display = "block";
  }
});

export {
  connectToNewUser,
  socket,
  roomId,
  updateCurrentRoom,
  currentRoom,
  peerInstance,
  myPeerId,
  currentStream,
};
