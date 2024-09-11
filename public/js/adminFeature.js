import { checkStatus } from "https://static.connectnow.website/connectnow/static/utils/loginOutAndRegister.js";
import { socket } from "./script.js";

const BASE_URL = "https://www.connectnow.website";

async function adminFeature() {
  const path = window.location.pathname.split("/");
  const roomId = path[path.length - 1];
  try {
    const payload = await checkStatus();
    const roomAdminResponse = await fetch(
      `${BASE_URL}/api/roomAdmin/${roomId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("session")}`,
        },
      }
    );
    const roomAdmin = await roomAdminResponse.json();
    const roomAdminId = roomAdmin[0].admin_user_id;
    if (roomAdminId == payload.payload.userId) {
      const activitiesWrapper = document.querySelector(".activities-wrapper");
      const breakoutRoomControls = document.querySelector("#controls");
      const pollForm = document.querySelector("#poll-form");

      const activitiesWrapperHtml = `
                  <div class="video-record">
                    <div class="icon-wrapper">
                        <i class="fas fa-record-vinyl"></i>
                    </div>
                    <div class="activities-description">
                        <p>錄製</p>
                        <p>錄下會議過程供日後隨選觀看</p>
                    </div>
                </div> `;
      activitiesWrapper.insertAdjacentHTML("beforeend", activitiesWrapperHtml);

      const breakoutRoomControlsHTML = `<div class="group-number-wrapper">
                <input type="number" id="groupCount" placeholder="Enter number of groups">
                <button id="createGroups">Create Groups</button>
            </div>
            <div class="timer-wrapper">
                <input type="number" id="timerInput" placeholder="Enter timer in seconds">
                <button id="finishGrouping">Finish Grouping</button>
            </div>`;
      breakoutRoomControls.insertAdjacentHTML(
        "beforeend",
        breakoutRoomControlsHTML
      );

      const pollFormHTML = `<div class="poll-question-container">
                    <label for="poll-question">問題：</label>
                    <input type="text" id="poll-question" name="poll-question" required>
                </div>
                <div id="poll-options">
                    <div class="option-container option-1-container">
                        <label for="option-1">選項 1：</label>
                        <input type="text" id="option-1" name="options" required>
                    </div>
                    <div class="option-container option-2-container">
                        <label for="option-2">選項 2：</label>
                        <input type="text" id="option-2" name="options" required>
                    </div>
                </div>
                <button type="button" id="add-option">添加選項</button>
                <button type="submit">提交投票</button>`;
      pollForm.insertAdjacentHTML("beforeend", pollFormHTML);
    }
  } catch (error) {
    console.error(error);
  }
}

adminFeature();

socket.on("room-admin-update", (newAdminId) => {
  const waitingApprovalElement = document.getElementById(
    "waiting-for-approval"
  );
  if (newAdminId == localStorage.getItem("userId")) {
    adminFeature();
    socket.on("user-join-request", (payload, roomId) => {
      console.log("有人想加入房間");
      let joinRequestConfirm = confirm(
        ` ${payload.payload.userName} 想加入此會議`
      );
      if (!joinRequestConfirm) {
        socket.emit("reject-join-request", roomId);
      } else {
        socket.emit("accept-join-request", roomId);
      }
      waitingApprovalElement.classList.add("hidden"); // 核可完畢後隱藏提示
    });
  }
});
