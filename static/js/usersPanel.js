import { initializeMuteMicHandler } from "./muteMic.js";
import { socket, roomId } from "./script.js";
import { checkStatus } from "https://static.connectnow.website/connectnow/static/utils/loginOutAndRegister.js";

const BASE_URL =
  window.location.protocol == "https:"
    ? "https://www.connectnow.website"
    : "http://127.0.0.1:8080";

// users panel
async function updateUsersList() {
  const payload = await checkStatus();
  const roomAdminResponse = await fetch(`${BASE_URL}/api/roomAdmin/${roomId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("session")}`,
    },
  });
  const roomAdmin = await roomAdminResponse.json();
  const roomAdminId = roomAdmin[0].admin_user_id;

  const participantsList = document.querySelector(".users-content");
  participantsList.innerHTML = "";
  const token = localStorage.getItem("session");

  try {
    const usersResponse = await fetch(`${BASE_URL}/api/allUsers`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const usersList = await usersResponse.json();

    // 獲取當前房間用戶的靜音狀態
    const muteStatusResponse = await fetch(
      `${BASE_URL}/api/muteStatus/${roomId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("session")}`,
        },
      }
    );
    const muteStatus = await muteStatusResponse.json();

    const currentUserId = localStorage.getItem("userId");
    console.log("currentUserId:", currentUserId);
    const sortedUserList = usersList.sort((a, b) => {
      if (String(a.id) === String(currentUserId)) return -1; // 當 a 是當前使用者時，a 應排在前面
      if (String(b.id) === String(currentUserId)) return 1; // 當 b 是當前使用者時，a 應排在前面，b 在後面
      return 0; // 其他項目順序不變
    });

    sortedUserList.forEach((user) => {
      const isMuted = muteStatus[user.id] || false; // 默认不静音
      const html = `<div class="users-container">
                <div class="avater-userName-wrapper">
                    <div class="avatar">
                        <img src="${
                          user.avatar_url ||
                          "https://static.connectnow.website/connectnow/static/images/user.png"
                        }" alt="avatar">
                    </div>
                    <div class="user-name">${user.name}</div>
                </div>
                <div class="usersPanel-mic" data-user-id="${user.id}">
                    <i class="fas ${
                      isMuted ? "fa-microphone-slash" : "fa-microphone"
                    }"></i>
                </div>
            </div>`;

      participantsList.insertAdjacentHTML("beforeend", html);
    });

    // 初始化靜音按鈕 event handler
    if (roomAdminId == payload.payload.userId) {
      initializeMuteMicHandler();
    }
  } catch (error) {
    console.error("Error fetching users:", error);
  }
}

function usersPanelDisplay() {
  const usersButton = document.querySelector(".participants");
  const usersPanel = document.getElementById("users-panel");
  const closeUsersButton = document.getElementById("close-users");
  const body = document.body;

  usersButton.addEventListener("click", () => {
    usersPanel.classList.add("show");
    body.classList.add("panel-open");
    updateUsersList(); // 每次打開面板時更新用戶列表
  });

  closeUsersButton.addEventListener("click", () => {
    usersPanel.classList.remove("show");
    body.classList.remove("panel-open");
  });
}
usersPanelDisplay();

// 監聽 sync-mic-icons 事件並更新 usersPanel-mic 按鈕
socket.on("sync-mic-icons", ({ userId, isMuted }) => {
  const micButton = document.querySelector(
    `.usersPanel-mic[data-user-id="${userId}"]`
  );
  if (micButton) {
    const micIcon = micButton.querySelector("i");
    micIcon.classList.toggle("fa-microphone", !isMuted);
    micIcon.classList.toggle("fa-microphone-slash", isMuted);
  }
});
