import { socket } from "./script.js";

const canvas = document.getElementById("whiteboard-canvas");
const context = canvas.getContext("2d");
let drawing = false;
let current = {
  color: document.querySelector(".color-picker").value,
  width: document.querySelector(".line-width").value,
};

canvas.addEventListener("mousedown", onMouseDown, false);
canvas.addEventListener("mouseup", onMouseUp, false);
canvas.addEventListener("mouseout", onMouseUp, false);
canvas.addEventListener("mousemove", throttle(onMouseMove, 10), false);

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

function drawLine(x0, y0, x1, y1, color, width, emit) {
  context.beginPath();
  context.moveTo(x0, y0);
  context.lineTo(x1, y1);
  context.strokeStyle = color;
  context.lineWidth = width;
  context.stroke();
  context.closePath();

  if (!emit) {
    return;
  }
  socket.emit("draw", { x0, y0, x1, y1, color, width });
}

function onMouseDown(e) {
  drawing = true;
  current.x = e.clientX - canvas.offsetLeft;
  current.y = e.clientY - canvas.offsetTop;
}

function onMouseUp(e) {
  if (!drawing) {
    return;
  }
  drawing = false;
  drawLine(
    current.x,
    current.y,
    e.clientX - canvas.offsetLeft,
    e.clientY - canvas.offsetTop,
    current.color,
    current.width,
    true
  );
}

function onMouseMove(e) {
  if (!drawing) {
    return;
  }
  drawLine(
    current.x,
    current.y,
    e.clientX - canvas.offsetLeft,
    e.clientY - canvas.offsetTop,
    current.color,
    current.width,
    true
  );
  current.x = e.clientX - canvas.offsetLeft;
  current.y = e.clientY - canvas.offsetTop;
}

function clearWhiteboard() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  socket.emit("clear-whiteboard");
}

function redrawWhiteboard(whiteboardState) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  whiteboardState.forEach((lineData) => {
    drawLine(
      lineData.x0,
      lineData.y0,
      lineData.x1,
      lineData.y1,
      lineData.color,
      lineData.width,
      false
    );
  });
}

socket.on("draw", (data) => {
  drawLine(data.x0, data.y0, data.x1, data.y1, data.color, data.width, false);
});

socket.on("clear-whiteboard", () => {
  context.clearRect(0, 0, canvas.width, canvas.height);
});

// 處理接收到的白板狀態
socket.on("current-whiteboard-state", (whiteboardState) => {
  redrawWhiteboard(whiteboardState);
});

// 防止事件過於頻繁
function throttle(callback, delay) {
  let previousCall = new Date().getTime();
  return function () {
    const time = new Date().getTime();

    if (time - previousCall >= delay) {
      previousCall = time;
      callback.apply(null, arguments);
    }
  };
}

// 當用戶加入房間時，發送 join-room 事件並請求白板狀態
function joinRoom(roomId, userId) {
  socket.emit("join-room", roomId, userId);
  // 加入房間後立即請求白板狀態
  socket.emit("request-whiteboard-state");
}

document.addEventListener("DOMContentLoaded", async () => {
  const pathSegments = window.location.pathname.split("/");
  const roomId = pathSegments[pathSegments.length - 1]; // 替換為實際的房間 ID 獲取邏輯
  const token = localStorage.getItem("session");
  const response = await fetch("/api/user/auth", {
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
