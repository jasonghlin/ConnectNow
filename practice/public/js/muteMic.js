// mutemic.js
import { socket } from "./script.js";
const userMic = document.querySelector(".mic-icon");
userMic.setAttribute("data-user-id", localStorage.getItem("userId"));
async function handleMuteMicToggle() {
  const userMicButtons = document.querySelectorAll(".usersPanel-mic");

  userMicButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const pathSegments = window.location.pathname.split("/");
      const roomId = pathSegments[pathSegments.length - 1];
      console.log(roomId);
      const userId = this.getAttribute("data-user-id");
      const micIcon = this.querySelector("i");

      // 切換靜音圖示
      const isMuted = micIcon.classList.contains("fa-microphone-slash");
      micIcon.classList.toggle("fa-microphone", isMuted);
      micIcon.classList.toggle("fa-microphone-slash", !isMuted);

      socket.emit("toggle-user-mic", { roomId, userId, isMuted: !isMuted });
    });
  });
}

socket.on("sync-mic-icons", (userId, isMuted) => {
  console.log("ok");
  if (userId == localStorage.getItem("userId")) {
    const userMic = document.querySelector(
      `.usersPanel-mic[data-user-id="${userId}"] > i`
    );
    console.log(userMic);
    userMic.className = isMuted
      ? "fas fa-microphone-slash"
      : "fas fa-microphone";
  }
});
export function initializeMuteMicHandler() {
  handleMuteMicToggle();
}
