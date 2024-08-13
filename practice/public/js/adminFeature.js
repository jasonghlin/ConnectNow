import { socket } from "./script.js";
// 確認是否為房長，是的話多了分組、錄製、意見調查功能
const path = window.location.pathname.split("/");
const roomId = path[path.length - 1];
const isAdminResponse = await fetch("/api/admin", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("session")}`,
  },
  body: JSON.stringify({ roomId }),
});
const isAdmin = await isAdminResponse.json();
if (isAdmin.admin) {
  const activitiesWrapper = document.querySelector(".activities-wrapper");
  const breakoutRoomControls = document.querySelector("#controls");
  const pollForm = document.querySelector("#poll-form");
  const activitiesWrapperHtml = `
                <div class="video-record">
                    <div class="icon-wrapper">
                        <i class="fas fa-record-vinyl"></i>
                    </div>
                    <div>
                        <p>錄製</p>
                        <p>錄下會議過程供日後隨選觀看</p>
                    </div>
                </div>`;
  activitiesWrapper.insertAdjacentHTML("beforeend", activitiesWrapperHtml);

  const breakoutRoomControlsHTML = `<input type="number" id="groupCount" placeholder="Enter number of groups">
            <button id="createGroups">Create Groups</button>
            <input type="number" id="timerInput" placeholder="Enter timer in seconds">
            <button id="finishGrouping">Finish Grouping</button>`;
  breakoutRoomControls.insertAdjacentHTML(
    "beforeend",
    breakoutRoomControlsHTML
  );

  const pollFormHTML = `<label for="poll-question">問題：</label>
                <input type="text" id="poll-question" name="poll-question" required>
                <div id="poll-options">
                    <label for="option-1">選項 1：</label>
                    <input type="text" id="option-1" name="options" required>
                    <label for="option-2">選項 2：</label>
                    <input type="text" id="option-2" name="options" required>
                </div>
                <button type="button" id="add-option">添加選項</button>
                <button type="submit">提交投票</button>`;
  pollForm.insertAdjacentHTML("beforeend", pollFormHTML);
}
