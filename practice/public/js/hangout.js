import { socket } from "./script";

function hangOutEvent() {
  document.querySelector(".hangout").addEventListener("click", (e) => {
    // 發送 'user-hangout' 事件給伺服器，並附帶 userId
    socket.emit("user-leaving");
    window.location.href = "/";
  });
}

hangOutEvent();
