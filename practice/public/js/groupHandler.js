import {
  socket,
  updateCurrentRoom,
  currentRoom,
  peerInstance,
} from "./script.js";
async function handleFinishGrouping(groupsData, timerInputValue) {
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
    updateCurrentRoom(groupName); // 更新 URL 並重定向
    console.log(currentRoom);
    const newUrl = currentUrl.replace(mainRoomName, groupName);

    // 斷開所有當前的 peer 連接
    peerInstance.disconnect();

    // 清除所有遠端視訊
    document
      .querySelectorAll("video:not(.local-stream)")
      .forEach((video) => video.remove());

    history.pushState(null, "", newUrl);

    // 使用舊的 peerId 重新連接
    peerInstance.reconnect(peerInstance.id);

    console.log("peerInstance.id: ", peerInstance.id);
    // 加入新的組
    socket.emit(
      "join-breakout-room",
      currentRoom,
      peerInstance.id,
      currentUserId
    );

    // 發送倒計時開始事件
    // socket.emit("start-countdown", timerInputValue);
  } else {
    console.error("User is not part of any group.");
  }
}

export { handleFinishGrouping };
