async function handleFinishGrouping(groupsData, timerInputValue) {
  const { socket, updateCurrentRoom, currentRoom, peerInstance } = await import(
    "./script.js"
  );
  const currentUrl = window.location.href;
  const mainRoomName = localStorage.getItem("mainRoom");
  // 獲取用戶認證信息
  const response = await fetch("/api/user/auth", {
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
    updateCurrentRoom(groupName); // 更新 URL 並重定向
    console.log(currentRoom);
    const newUrl = `${window.location.origin}/breakoutRoom/${mainRoomName}/${groupName}`;

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
    socket.emit(
      "join-breakout-room",
      currentRoom,
      peerInstance.id,
      currentUserId
    );
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
