import { socket, roomId } from "./script.js";
let userId = localStorage.getItem("userId");
document.querySelector(".mic-icon").setAttribute(`data-user-id`, userId);

function handleMuteMicToggle() {
  const userMicButtons = document.querySelectorAll(".usersPanel-mic");

  userMicButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const userId = this.getAttribute("data-user-id");
      const micIcon = this.querySelector("i");

      // 切換靜音圖示
      const isMuted = micIcon.classList.contains("fa-microphone-slash");
      micIcon.classList.toggle("fa-microphone", isMuted);
      micIcon.classList.toggle("fa-microphone-slash", !isMuted);
      console.log(socket);
      // 發送事件給後端，同步靜音狀態
      socket.emit("toggle-user-mic", { roomId, userId, isMuted: !isMuted });
    });
  });
}

export function initializeMuteMicHandler() {
  handleMuteMicToggle();
}
