export default function socketBreakoutRoom(io, socket) {
  socket.on("join-breakout-room", (breakouRoomName, peerId, userId) => {
    try {
      console.log(
        `Attempt to join: User ${userId} joining breakout room ${breakouRoomName} with peerId ${peerId}`
      );

      if (!breakouRoomName || !userId || !peerId) {
        console.error("Invalid roomName, userId, or peerId");
        socket.emit("join-error", "Invalid room or user data");
        return;
      }

      // 儲存房間和使用者信息
      console.log(
        "Received breakout room Name:",
        breakouRoomName,
        "userId:",
        userId,
        "peerId:",
        peerId
      );
      // socket.data.roomName = roomName;
      // socket.data.userId = userId;
      socket.data.peerId = peerId;

      console.log("Data stored in socket:", socket.data);
      socket.join(breakouRoomName);
      io.to(breakouRoomName).emit(
        "user-connected-breakoutRoom",
        peerId,
        userId
      );
    } catch (error) {
      console.log(error);
    }
  });

  // finish grouping
  socket.on("finish-grouping", (data, timerInputValue, roomName) => {
    io.to(roomName).emit("start-breakoutRoom", data.data, timerInputValue);
    setTimeout(() => {
      io.to(roomName).emit("return-to-main-room", roomName);
    }, timerInputValue * 1000);
  });

  // return to main room
  socket.on("rejoin-main-room", (roomName, peerId, userId) => {
    io.to(roomName).emit("rejoin-main-room", peerId, userId);
  });
}
