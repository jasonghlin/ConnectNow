export const userMuteStatus = {}; // 儲存每個房間中使用者的靜音狀態，key 是 roomId, 值为包含用户静音状态的对象

export default function socketMedia(io, socket) {
  // toggle mic
  socket.on("toggle-mic-status", (roomName, peerId, userId, isMicMuted) => {
    // 更新靜音狀態
    if (!userMuteStatus[roomName]) {
      userMuteStatus[roomName] = {};
    }
    userMuteStatus[roomName][userId] = isMicMuted;

    socket.to(roomName).emit("user-mic-status-changed", peerId, isMicMuted);
  });

  //   從 usersPanel 面板 toggle mic
  socket.on("toggle-user-mic", ({ roomId: roomName, userId, isMuted }) => {
    if (!userMuteStatus[roomName]) {
      userMuteStatus[roomName] = {};
    }
    userMuteStatus[roomName][userId] = isMuted;
    console.log(
      "userMuteStatus[roomName]: ",
      roomName,
      userMuteStatus[roomName]
    );
    // 將變更通知給同個房間內的其他用戶
    io.to(roomName).emit("user-mic-status-changed-by-usersPanel", {
      userId,
      isMuted,
    });
  });

  socket.on("sync-mic-icons", ({ roomId: roomName, userId, isMuted }) => {
    io.to(roomName).emit("sync-mic-icons", { userId, isMuted });
  });

  //   變更 video audio
  socket.on("update-video-stream", (roomName, peerId, userId) => {
    console.log(`${userId} updated their video source in room: ${roomName}`);
    socket.to(roomName).emit("update-video-stream", roomName, peerId, userId);
  });

  socket.on("update-audio-source", (roomName, peerId, userId) => {
    console.log(
      `User ${userId} in room ${roomName} updated their audio source`
    );

    // 將音訊更新事件廣播給房間內的其他用戶
    socket.to(roomName).emit("user-audio-source-updated", peerId, userId);
  });

  // toggle video
  socket.on("toggle-video-status", (roomName, peerId, userId, isVideoMuted) => {
    console.log(
      `${userId} (${peerId}) toggled video status to: ${isVideoMuted}`
    );

    // 廣播給同房間的其他使用者
    socket.to(roomName).emit("toggle-video-status", peerId, isVideoMuted);
  });

  // 處理開始螢幕分享
  socket.on("start-screen-share", (roomName, peerId) => {
    socket.to(roomName).emit("user-screen-share-started", peerId);
  });

  // 處理停止螢幕分享
  socket.on("stop-screen-share", (roomName, peerId) => {
    socket.to(roomName).emit("user-screen-share-stopped", peerId);
  });
}
