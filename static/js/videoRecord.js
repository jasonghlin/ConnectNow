import { roomId, socket } from "./script.js";
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
const BASE_URL =
  window.location.protocol == "https:"
    ? "https://www.connectnow.website"
    : "http://127.0.0.1:8080";

// 新增錄影中的圖示
function addRecordingOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "recording-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.zIndex = "9999"; // 確保在最上層
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)"; // 半透明背景
  overlay.innerHTML = `
    <div style="position: absolute; top: 10px; left: 10px; color: red; font-size: 24px;">
      <i class="fas fa-record-vinyl"></i> 錄影中...
    </div>
  `;
  document.body.prepend(overlay);
}

// 移除錄影中的圖示
function removeRecordingOverlay() {
  const overlay = document.getElementById("recording-overlay");
  if (overlay) {
    overlay.remove();
  }
}

function isRecordingOrNot(isRecording) {
  if (isRecording) {
    document.querySelector(
      ".video-record"
    ).innerHTML = `<div class="icon-wrapper is-recording">
                        <i class="fas fa-record-vinyl"></i>
                    </div>
                    <div class="activities-description">
                        <p>停止錄製</p>
                        <p>再次按下來停止錄製</p>
                    </div>`;
  } else {
    document.querySelector(
      ".video-record"
    ).innerHTML = `<div class="icon-wrapper">
                        <i class="fas fa-record-vinyl"></i>
                    </div>
                    <div class="activities-description">
                        <p>錄製</p>
                        <p>錄下會議過程供日後隨選觀看</p>
                    </div>`;
  }
}

async function handleVideoRecordClick() {
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    const result = await Swal.fire({
      title: "確定要開始錄影嗎？",
      text: "請確認大家都準備好後再開始錄影",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#4285F4",
      cancelButtonColor: "#DB4437",
      confirmButtonText: "開始錄影",
    });

    if (result.isConfirmed) {
      isRecording = true;
      startRecording();
    }
  } else if (mediaRecorder.state === "recording") {
    const result = await Swal.fire({
      title: "是否要結束錄影？",
      text: "確認結束錄影後會開始上傳影片並生成字幕",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#4285F4",
      cancelButtonColor: "#DB4437",
      confirmButtonText: "結束錄影",
    });

    if (result.isConfirmed) {
      isRecording = false;
      stopRecording();
    }
  }
}

// 使用 MutationObserver 監聽 DOM 變化
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      // 檢查是否是我們想要的按鈕
      if (node.classList && node.classList.contains("video-record")) {
        // 為新加的按鈕增加事件監聽器
        node.addEventListener("click", handleVideoRecordClick);
      }
    });
  });
});

// 啟動 observer 監聽 document body 上的變化
observer.observe(document.body, { childList: true, subtree: true });

// 限制影片錄製時間為30分鐘
let recordingLimit = 30 * 60 * 1000;

async function startRecording() {
  try {
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: "always",
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    if (displayStream) {
      isRecording = true;
    } else {
      isRecording = false;
    }

    isRecordingOrNot(isRecording);

    const Toast = Swal.mixin({
      toast: true,
      position: "center",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      customClass: {
        popup: "swal2-toast-custom",
        title: "swal2-title-custom",
        icon: "swal2-icon-custom",
        timerProgressBar: "swal2-progress-bar-custom",
      },
      onOpen: (toast) => {
        toast.addEventListener("mouseenter", Swal.stopTimer);
        toast.addEventListener("mouseleave", Swal.resumeTimer);
      },
    });
    Toast.fire({
      icon: "success",
      title: "錄影準備中",
    });

    const audioStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    const combinedStream = new MediaStream([
      ...displayStream.getVideoTracks(),
      ...audioStream.getAudioTracks(),
    ]);

    mediaRecorder = new MediaRecorder(combinedStream);
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.onstop = handleStop;
    mediaRecorder.start();

    console.log("Recording started");
    Swal.fire("開始錄影");
    socket.emit("start-recording", roomId);
    console.log("Emitting start-recording event for room:", roomId);

    // 設定錄製時間限制
    setTimeout(() => {
      if (isRecording) {
        let videoRecordButton = document.querySelector(".video-record");

        if (videoRecordButton) {
          videoRecordButton.click();
        } else {
          console.log("找不到 class 為 'video-record' 的元素");
        }

        Swal.fire("錄製時間已達 30 分鐘", "錄製自動結束", "info");
      }
    }, recordingLimit);
  } catch (err) {
    console.error("Error: " + err);
  }
}

const waitingUploadElement = document.getElementById("waiting-for-upload");
function stopRecording() {
  mediaRecorder.stop();
  isRecordingOrNot(isRecording);
  waitingUploadElement.classList.remove("hidden");
  console.log("錄影結束");
  socket.emit("stop-recording", roomId);
}

function handleDataAvailable(event) {
  if (event.data.size > 0) {
    recordedChunks.push(event.data);
  }
}

async function handleStop() {
  const webmBlob = new Blob(recordedChunks, { type: "video/webm" });

  try {
    // 請求預簽名的 S3 URL
    const pathSegments = window.location.pathname.split("/");
    const roomId = pathSegments[pathSegments.length - 1];
    const fileName = `video_${roomId}_${Date.now()}.webm`;
    const response = await fetch(
      `${BASE_URL}/presignedUrl?fileName=${encodeURIComponent(
        fileName
      )}&fileType=${encodeURIComponent("video/webm")}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("session")}`,
        },
      }
    );
    const { url } = await response.json();

    // 使用預簽名 URL 上傳影片
    const uploadResponse = await fetch(`${url}`, {
      method: "PUT",
      headers: {
        "Content-Type": "video/webm",
      },
      body: webmBlob,
    });

    if (uploadResponse.ok) {
      console.log("影片成功上傳到 S3");
      waitingUploadElement.classList.add("hidden");
      Swal.fire("影片上傳成功，正在進行轉檔與字幕生成", "", "success");
      await fetch(`${BASE_URL}/videoRecord`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("session")}`,
        },
        body: JSON.stringify({ fileName, roomId }),
      });

      console.log("File uploaded and task added to SQS");
    } else {
      throw new Error("影片上傳失敗");
    }
  } catch (error) {
    console.error("影片上傳時發生錯誤:", error);
    Swal.fire("上傳影片時發生錯誤", error.message, "error");
  }

  recordedChunks = []; // 清空錄製資料
}

socket.on("start-recording", () => {
  addRecordingOverlay(); // 開始錄影時添加 overlay
});

socket.on("stop-recording", () => {
  removeRecordingOverlay(); // 錄影結束時移除 overlay
});
