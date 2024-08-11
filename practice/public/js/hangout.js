import { socket, myPeerId } from "./script.js";

function hangOutEvent() {
  document.querySelector(".hangout").addEventListener("click", (e) => {
    // 發送 'user-hangout' 事件給伺服器，並附帶 userId
    socket.emit("user-hangout", myPeerId);
    window.location.href = "/";
  });
}

hangOutEvent();
