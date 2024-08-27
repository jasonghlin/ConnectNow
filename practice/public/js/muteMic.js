// mutemic.js
async function loadSocketAndRoom() {
  const { socket, roomId } = await import("../utils/shared.js");
  return { socket, roomId };
}

async function handleMuteMicToggle() {
  const { socket, roomId } = await loadSocketAndRoom();
  const userMicButtons = document.querySelectorAll(".usersPanel-mic");

  userMicButtons.forEach((button) => {
    button.addEventListener("click", function () {
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

export function initializeMuteMicHandler() {
  handleMuteMicToggle();
}
