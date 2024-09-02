import { checkStatus } from "/static/utils/loginOutAndRegister.js";
import { socket } from "./script.js";

async function chatLogic() {
  const userInfo = await checkStatus();
  const messageContainer = document.querySelector(".message-container");
  const messageInput = document.getElementById("message-input");
  const sendButton = document.getElementById("send-button");

  let roomId = window.location.pathname.split("/").pop();

  // Function to load chat messages from Redis
  function loadChat(roomId) {
    socket.emit("load-chat", roomId, (messages) => {
      messageContainer.innerHTML = ""; // Clear current messages
      messages.forEach((msg) => {
        if (msg.userName === userInfo.payload.userName) {
          appendMessage("You", msg.message);
        } else {
          appendMessage(msg.userName, msg.message);
        }
      });
    });
  }

  // Load initial chat messages
  loadChat(roomId);

  sendButton.addEventListener("click", () => {
    const message = messageInput.value.trim();
    if (message) {
      const userName = userInfo.payload.userName;
      socket.emit("send-message", { roomId, message, userName });
      appendMessage("You", message);
      messageInput.value = "";
    }
  });

  messageInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      const message = messageInput.value.trim();
      if (message) {
        const userName = userInfo.payload.userName;
        socket.emit("send-message", { roomId, message, userName });
        appendMessage("You", message);
        messageInput.value = "";
      }
    }
  });

  socket.on("receive-message", ({ message, userName }) => {
    if (userName !== userInfo.payload.userName) {
      appendMessage(userName, message);
    }
  });

  function appendMessage(userName, message) {
    const html = `<div class="message-wrapper">
        <div class="name-time">
            <div class="message-name">${userName}</div>
            <div class="message-time">${
              new Date().getHours() >= 12
                ? "下午"
                : new Date().getHours() >= 18
                ? "晚上"
                : "早上"
            } ${
      new Date().getHours() < 12
        ? new Date().getHours() < 10
          ? `0${new Date().getHours()}`
          : new Date().getHours()
        : new Date().getHours() - 12
    }:${
      new Date().getMinutes() < 10
        ? `0${new Date().getMinutes()}`
        : new Date().getMinutes()
    }</div>
        </div>
        <div class="message-info">${message}</div>
    </div>`;

    messageContainer.insertAdjacentHTML("beforeend", html);
  }

  // Handle room switch (e.g., moving to a breakout room)
  socket.on("switch-room", (newRoomId) => {
    roomId = newRoomId;
    loadChat(roomId); // Load new room's chat
  });
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
