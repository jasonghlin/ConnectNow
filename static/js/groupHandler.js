async function handleFinishGrouping(groupsData, timerInputValue) {
  const { socket, updateCurrentRoom, currentRoom, peerInstance } = await import(
    "./script.js"
  );

  const BASE_URL =
    window.location.protocol == "https:"
      ? "https://www.connectnow.website"
      : "http://127.0.0.1:8080";

  const currentUrl = window.location.href;
  const mainRoomName = localStorage.getItem("mainRoom");
  // 獲取用戶認證信息
  const response = await fetch(`${BASE_URL}/api/user/auth`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("session")}`,
    },
  });
  const payload = await response.json();
  const currentUserId = payload.payload.userId;

  // 將 groupName 保存到 localStorage
  groupsData.forEach((groupData) => {
    console.log("groupData: ", groupData);
    groupData.group.members.forEach((member) => {
      console.log("member: ", member);
      if (member.id == currentUserId) {
        localStorage.setItem(`breakoutRoom`, `breakout-${groupData.groupId}`);
        console.log(
          "breakoutRoom localStorage set: ",
          `breakout-${groupData.groupId}`
        );
      }
    });
  });

  // 查找當前用戶所在的組
  const userGroup = groupsData.find((groupData) =>
    groupData.group.members.some((member) => member.id == currentUserId)
  );

  console.log("userGroup: ", userGroup);
  if (userGroup) {
    const groupName = localStorage.getItem(`breakoutRoom`);
    const mainRoomName = localStorage.getItem("mainRoom");
    const peerId = localStorage.getItem("peerId");
    updateCurrentRoom(groupName); // 更新 URL 並重定向
    console.log(currentRoom);
    const newUrl = `${window.location.origin}/breakoutRoom/${mainRoomName}/${groupName}`;

    const joinBreakoutRoomRequest = await fetch(newUrl);

    if (!joinBreakoutRoomRequest.ok) {
      // 取得錯誤訊息，假設後端有返回錯誤訊息
      const errorMessage = await joinBreakoutRoomRequest.text();
      throw new Error(
        errorMessage ||
          `Failed to join breakout room: ${joinBreakoutRoomRequest.status}`
      );
    }

    // 成功的情況，解析 JSON 資料
    const data = await joinBreakoutRoomRequest.json();
    console.log("Response data:", data);

    // 斷開所有當前的 peer 連接
    peerInstance.disconnect();

    // 清除所有遠端視訊
    document
      .querySelectorAll(".video-wrapper:not(.local-stream)")
      .forEach((video) => video.remove());

    history.pushState(null, "", newUrl);
    // window.location.href = newUrl;
    // 使用舊的 peerId 重新連接

    console.log("peerInstance.id: ", peerInstance.id);
    // 加入新的組
    socket.emit("join-breakout-room", groupName, peerId, currentUserId);
    peerInstance.reconnect(peerInstance.id);
    // 發送倒計時開始事件
    startCountdown(timerInputValue);
  } else {
    console.error("User is not part of any group.");
  }
}

function startCountdown(seconds) {
  if (isNaN(seconds)) return;
  const timerDisplay = document.getElementById("timerDisplay");
  const timeLeft = document.getElementById("timeLeft");
  timeLeft.style.display = "inline";
  timerDisplay.style.display = "block";

  const countdownInterval = setInterval(() => {
    timeLeft.textContent = `${seconds - 1}`;
    seconds--;

    if (seconds < 0) {
      clearInterval(countdownInterval);
      timeLeft.style.display = "none";
    }
  }, 1000);
}

export { handleFinishGrouping };
