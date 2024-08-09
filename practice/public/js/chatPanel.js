import { checkStatus } from "../utils/loginOutAndRegister.js";
import { socket } from "./script.js";

// chat panel
async function chatLogic() {
  const userInfo = await checkStatus();
  const messageContainer = document.querySelector(".message-container");
  const messageInput = document.getElementById("message-input");
  const sendButton = document.getElementById("send-button");

  const path = window.location.pathname.split("/");
  const roomId = path[path.length - 1];

  sendButton.addEventListener("click", () => {
    const message = messageInput.value.trim();
    if (message) {
      const userName = userInfo.payload.userName;
      socket.emit("send-message", { roomId, message, userName });
      appendMessage(`You: ${message}`);
      messageInput.value = "";
    }
  });

  socket.on("receive-message", ({ message, userName }) => {
    if (userName !== userInfo.payload.userName) {
      appendMessage(`${userName}: ${message}`);
    }
  });

  // Append message to the container
  function appendMessage(message) {
    const messageElement = document.createElement("div");
    messageElement.textContent = message;
    messageContainer.append(messageElement);
  }
}

chatLogic();

function chatPanelDisplay() {
  const chatButton = document.querySelector(".chat");
  const chatPanel = document.querySelector(".chat-panel");
  const closeUsersButton = document.getElementById("close-chat");
  const body = document.body;

  chatButton.addEventListener("click", () => {
    chatPanel.classList.add("show");
    body.classList.add("panel-open");
  });

  closeUsersButton.addEventListener("click", () => {
    chatPanel.classList.remove("show");
    body.classList.remove("panel-open");
  });
}
chatPanelDisplay();
