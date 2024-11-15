import { socket } from "./script.js";
import { updateVideoLayout } from "./videoLayout.js";

function initializeCanvas() {
  // Set the canvas dimensions
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Fill the canvas with a white background
  context.fillStyle = "#FFFFFF"; // or any color you prefer
  context.fillRect(0, 0, canvas.width, canvas.height);
}

const canvas = document.getElementById("whiteboard-canvas");
const context = canvas.getContext("2d");
const BASE_URL =
  window.location.protocol == "https:"
    ? "https://www.connectnow.website"
    : "http://127.0.0.1:8080";

let drawing = false;
let isErasing = false; // 判斷是否使用橡皮擦
let current = {
  color: document.querySelector(".color-picker").value,
  width: document.querySelector(".line-width").value,
};

canvas.addEventListener("mousedown", onMouseDown, false);
canvas.addEventListener("mouseup", onMouseUp, false);
canvas.addEventListener("mouseout", onMouseUp, false);
canvas.addEventListener("mousemove", onMouseMove, false);

// 設置顏色和寬度變更事件
document.querySelector(".color-picker").addEventListener("input", (e) => {
  current.color = e.target.value;
});
document.querySelector(".line-width").addEventListener("input", (e) => {
  current.width = e.target.value;
});

// 清除白板按鈕
document
  .querySelector(".clear-whiteboard")
  .addEventListener("click", clearWhiteboard);

function drawLine(x0, y0, x1, y1, color, width, isErasing, emit) {
  console.log("draw line function:", {
    x0,
    y0,
    x1,
    y1,
    color,
    width,
    isErasing,
    emit,
  });
  context.beginPath();
  context.moveTo(x0, y0);
  context.lineTo(x1, y1);
  context.lineWidth = width;
  context.lineCap = "round";

  if (isErasing) {
    // Use the background color to simulate erasing
    context.strokeStyle = "#FFFFFF"; // Ensure this matches the canvas background
  } else {
    context.strokeStyle = color;
  }

  context.stroke();
  context.closePath();

  if (!emit) {
    return;
  }

  const pathSegments = window.location.pathname.split("/");
  const roomId = pathSegments[pathSegments.length - 1];
  console.log("Emitting draw data:", {
    roomId,
    x0,
    y0,
    x1,
    y1,
    color,
    width,
    isErasing,
  });
  socket.emit("draw", { roomId, x0, y0, x1, y1, color, width, isErasing });
}

// 橡皮擦按鈕
document.querySelector(".eraser-tool").addEventListener("click", () => {
  isErasing = !isErasing; // 切换橡皮擦模式
  if (isErasing) {
    document.querySelector(".eraser-tool").textContent = "畫筆模式";
  } else {
    document.querySelector(".eraser-tool").textContent = "橡皮擦";
  }
});

function onMouseUp(e) {
  if (!drawing) {
    return;
  }
  drawing = false;
}
function getMousePos(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (evt.clientX - rect.left) * (canvas.width / rect.width),
    y: (evt.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function onMouseDown(e) {
  drawing = true;
  const pos = getMousePos(canvas, e);
  current.x = pos.x;
  current.y = pos.y;
}

function onMouseMove(e) {
  if (!drawing) return;

  const pos = getMousePos(canvas, e);
  drawLine(
    current.x,
    current.y,
    pos.x,
    pos.y,
    current.color,
    current.width,
    isErasing,
    true
  );
  current.x = pos.x;
  current.y = pos.y;
}

function clearWhiteboard() {
  context.fillStyle = "#FFFFFF"; // Use the same background color
  context.fillRect(0, 0, canvas.width, canvas.height);
  const pathSegments = window.location.pathname.split("/");
  const roomId = pathSegments[pathSegments.length - 1];
  socket.emit("clear-whiteboard", roomId);
}

function redrawWhiteboard(whiteboardState) {
  initializeCanvas(); // 清除并初始化画布

  whiteboardState?.forEach((lineData) => {
    drawLine(
      lineData.x0,
      lineData.y0,
      lineData.x1,
      lineData.y1,
      lineData.color,
      lineData.width,
      lineData.isErasing,
      false
    );
  });
}

socket.on("draw", (data) => {
  console.log("Received draw data:", data);
  drawLine(
    data.x0,
    data.y0,
    data.x1,
    data.y1,
    data.color,
    data.width,
    data.isErasing,
    false
  );
});

socket.on("clear-whiteboard", () => {
  context.clearRect(0, 0, canvas.width, canvas.height);
});

// 處理接收到的白板狀態
socket.on("current-whiteboard-state", (whiteboardState) => {
  redrawWhiteboard(whiteboardState);
});

// 防止事件過於頻繁
// function throttle(callback, delay) {
//   let previousCall = new Date().getTime();
//   return function () {
//     const time = new Date().getTime();

//     if (time - previousCall >= delay) {
//       previousCall = time;
//       callback.apply(null, arguments);
//     }
//   };
// }

// 當用戶加入房間時，發送 join-room 事件並請求白板狀態
function joinRoom(roomId, userId) {
  socket.emit("join-room", roomId, userId);
  // 加入房間後立即請求白板狀態
  socket.emit("request-whiteboard-state", roomId);
}

document.addEventListener("DOMContentLoaded", async () => {
  const pathSegments = window.location.pathname.split("/");
  const roomId = pathSegments[pathSegments.length - 1]; // 替換為實際的房間 ID 獲取邏輯
  const token = localStorage.getItem("session");
  const response = await fetch(`${BASE_URL}/api/user/auth`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  const userId = data.payload.userId; // 替換為實際的用戶 ID 獲取邏輯
  joinRoom(roomId, userId);
});

const whiteBoardBtn = document.querySelector(".white-board");
whiteBoardBtn.addEventListener("click", (e) => {
  const videoStream = document.querySelector(".video-stream");
  const videos = Array.from(videoStream.querySelectorAll(".video-wrapper"));
  const localStream = document.querySelector(".local-stream");
  videos.unshift(localStream);
  const whiteBoardCanvas = document.querySelector(".whiteboard-content");
  let smallVideosContainer = videoStream.querySelector(
    ".small-videos-container"
  );

  if (!smallVideosContainer) {
    smallVideosContainer = document.createElement("div");
    smallVideosContainer.className = "small-videos-container";
    videoStream.insertBefore(smallVideosContainer, videoStream.firstChild);
  }
  videoStream.style.flexDirection = "column";
  videos.forEach((video, index) => {
    video.classList.remove("main-video");
    video.classList.add("small-video");
    video.style.maxWidth = `200px`;
    video.style.height = "100%";
    smallVideosContainer.appendChild(video);
  });

  // const smallVideosCount = videos.length - 1;
  // const rows = Math.ceil(smallVideosCount / 3);
  smallVideosContainer.style.maxHeight = `200px`;

  whiteBoardCanvas.classList.remove("hidden");
});

document.querySelector(".close-whiteboard").addEventListener("click", (e) => {
  const videoStream = document.querySelector(".video-stream");
  const whiteBoardCanvas = document.querySelector(".whiteboard-content");
  const smallVideosContainer = videoStream.querySelector(
    ".small-videos-container"
  );

  if (smallVideosContainer) {
    // 逐一將視訊移回 video-stream 並恢復樣式
    const videos = Array.from(
      smallVideosContainer.querySelectorAll(".video-wrapper")
    );
    const localStream = document.querySelector(".local-stream");
    localStream.classList.remove("main-video");
    videos.unshift(localStream);
    videos.forEach((video) => {
      video.classList.remove("small-video");
      video.classList.add("main-video");
      video.style.maxWidth = "";
      video.style.height = "";
      videoStream.appendChild(video); // 確保視訊移回 video-stream
    });

    // 移除小視訊容器
    smallVideosContainer.remove();
    console.log("white board event listener");
    updateVideoLayout();
  }

  // 恢復排版
  videoStream.style.flexDirection = "row";
  whiteBoardCanvas.classList.add("hidden");
});

initializeCanvas(); // 初始化画布
