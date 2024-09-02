import { socket } from "./script.js";

console.log("Script loaded");
function hangOutEvent() {
  console.log("hangOutEvent function executed");
  document.querySelector(".hangout").addEventListener("click", (e) => {
    console.log("hangout");
    socket.emit("user-leaving");
    window.location.href = "/";
  });
}

hangOutEvent();
