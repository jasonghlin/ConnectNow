import { socket, roomId, myPeerId, peerInstance } from "./script.js"; // 假設主程式的檔案名是 main.js

let isSharingScreen = false;
let screenStream;

function updateRemoteSharingVideos(peerId, userVideoStream) {
  // 檢查頁面上是否已經有這個使用者的螢幕分享視訊元素
  let videoElement = document.querySelector(
    `video[data-peer-id="${peerId}-sharing"]`
  );

  if (!videoElement) {
    // 如果沒有該使用者的視訊元素，則創建一個新的
    videoElement = document.createElement("video");
    videoElement.setAttribute("data-peer-id", `${peerId}-sharing`);
    videoElement.autoplay = true;
    videoElement.playsInline = true;

    // 將新創建的視訊元素插入到指定的容器中
    const videoContainer = document.querySelector(".video-stream");
    videoContainer.appendChild(videoElement);
  }

  // 將新的視訊流賦值給視訊元素
  videoElement.srcObject = userVideoStream;

  // 處理播放錯誤
  videoElement.addEventListener("loadedmetadata", () => {
    videoElement.play().catch((error) => {
      console.error("Error playing video stream: ", error);
    });
  });
}

function connectToNewSharing(peerId, stream) {
  const call = peerInstance.call(peerId, stream);

  call.on("stream", (userVideoStream) => {
    updateRemoteSharingVideos(peerId, userVideoStream); // 更新視訊流
  });

  call.on("close", () => {
    // 清理關閉後的資源
    console.log(`Call with ${peerId}-sharing ended`);
    removeSharingVideoElement(peerId);
  });
}

function removeSharingVideoElement(peerId) {
  const videoElement = document.querySelector(
    `video[data-peer-id="${peerId}-sharing"]`
  );
  if (videoElement) {
    videoElement.remove();
  }
}

// 當按下分享螢幕按鈕時觸發
document.querySelector(".share-screen").addEventListener("click", async () => {
  if (!isSharingScreen) {
    try {
      // 開始分享螢幕
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      // 標記為已在分享螢幕
      isSharingScreen = true;

      // 通知其他參與者顯示分享的視訊
      socket.emit("start-screen-share", roomId, myPeerId);

      // 呼叫連線的其他使用者，傳遞螢幕分享流
      socket.emit("request-screen-share", roomId, myPeerId, screenStream);

      // 當本地螢幕分享結束時自動觸發停止分享
      screenStream.getTracks()[0].addEventListener("ended", stopScreenShare);
    } catch (error) {
      if (error.name === "NotFoundError") {
        console.error("Error: No display media device found.");
      } else if (error.name === "NotAllowedError") {
        console.error("Error: Permission to capture screen denied.");
      } else if (error.name === "AbortError") {
        console.error("Error: Screen share aborted.");
      } else {
        console.error("Error sharing screen:", error);
      }
    }
  } else {
    // 停止分享
    stopScreenShare();
  }
});

// 停止分享螢幕
function stopScreenShare() {
  if (isSharingScreen) {
    // 停止螢幕分享流
    screenStream.getTracks().forEach((track) => track.stop());
    isSharingScreen = false;

    // 通知其他參與者移除共享視窗
    socket.emit("stop-screen-share", roomId, myPeerId);
  }
}

// 監聽來自其他使用者的螢幕分享開始事件
socket.on("user-started-screen-share", (peerId) => {
  // 呼叫該使用者，要求接收螢幕分享流
  connectToNewSharing(peerId, screenStream);
});

// 監聽來自其他使用者的螢幕分享停止事件
socket.on("user-stopped-screen-share", (peerId) => {
  // 移除分享視窗的視訊元素
  removeSharingVideoElement(peerId);
});
