import { joinMainRoom } from "../../models/joinMainRoom.js";
import { removeUserFromMainRoom } from "../../models/removeUserFromMainRoom.js";
import { findMainRoomAdmin } from "../../models/findMainRoomAdmin.js";
import { getAllUsers } from "../../models/getAllUsers.js";
import { updateMainRoomAdmin } from "../../models/updateMainRoomAdmin.js";

const rooms = new Map();
export default function socketMainRoom(io, socket, redisClient) {
  socket.on("join-main-room", async (roomName, peerId, userId) => {
    try {
      console.log(
        `Attempt to join: User ${userId} joining room ${roomName} with peerId ${peerId}`
      );

      // 檢查 roomName、userId 和 peerId 是否有效
      if (!roomName || !userId || !peerId) {
        console.error("Invalid roomName, userId, or peerId");
        socket.emit("join-error", "Invalid room or user data");
        return;
      }

      const roomAdminId = await findMainRoomAdmin(roomName);
      console.log("roomAdminId", roomAdminId);
      const joinMainRoomSuccess = await joinMainRoom(
        userId,
        roomName,
        roomAdminId[0].admin_user_id
      );
      console.log("joinMainRoomSuccess: ", joinMainRoomSuccess);
      // 儲存房間和使用者信息
      console.log(
        "Received roomName:",
        roomName,
        "userId:",
        userId,
        "peerId:",
        peerId
      );
      // socket.data.roomName = roomName;
      // socket.data.userId = userId;
      socket.data.peerId = peerId;

      console.log("Data stored in socket:", socket.data);
      socket.join(roomName);

      // 確保 rooms Map 中存在該房間，並添加或更新用戶
      if (!rooms.has(roomName)) {
        rooms.set(roomName, new Map());
      }
      const roomUsers = rooms.get(roomName);

      // 如果用戶已存在，更新其 peerId
      if (roomUsers.has(userId)) {
        let existingUser = roomUsers.get(userId);
        existingUser = { ...existingUser, userId, peerId }; // 確保 userId 屬性存在於 existingUser 中
        console.log("roomUsers set:", userId, existingUser);
        roomUsers.set(userId, existingUser);
        console.log(`Updated peerId for User ${userId} in room ${roomName}`);
      } else {
        // 否則添加新的用戶信息
        roomUsers.set(userId, { userId, peerId });
        console.log(`User ${userId} successfully joined room ${roomName}`);
      }

      console.log(
        `1Room ${roomName} users:`,
        [...roomUsers.values()].map((u) => `${u.userId} (${u.peerId})`)
      );

      // 通知房間其他用戶有新用戶加入
      //   socket.to(roomName).emit("user-connected-mainRoom", peerId, userId);
      roomUsers.forEach((user) => {
        console.log("user: ", user);
        socket.to(roomName).emit("user-connected-mainRoom", peerId, userId);
      });

      // send white board state
      // 从 Redis 獲取當前房間的白板狀態
      const whiteboardState = await redisClient.lRange(
        `whiteboard:${roomName}`,
        0,
        -1
      );

      // 将状态数据从字符串解析为对象数组
      const parsedState = whiteboardState.map((line) => JSON.parse(line));

      // 將當前的白板狀態傳給 client
      socket.emit("current-whiteboard-state", parsedState);
    } catch (error) {
      console.log(error);
    }
  });

  //   disconnect
  socket.on("disconnect", async () => {
    try {
      console.log("Disconnecting socket data:", socket.data);
      const roomName = socket.data.roomName.roomId;
      const roomUsers = rooms.get(roomName);
      const userId = socket.data.userId;
      console.log("roomName: ", roomName);
      const roomAdmin = await findMainRoomAdmin(roomName);
      console.log("User disconnected");
      handleUserLeave(socket);
      if (roomUsers) {
        console.log(
          `2Room ${roomName} after leaving users:`,
          [...roomUsers.values()].map((u) => `${u.userId} (${u.peerId})`)
        );
      } else {
        console.log(`roomUsers with roomName ${roomName} does not exist`);
      }

      if (userId == roomAdmin[0].user_id) {
        const users = await getAllUsers(roomName);
        const randomAdminIndex = Math.floor(Math.random() * users.length);
        const newAdminId = users[randomAdminIndex].id;
        console.log("newAdminId: ", newAdminId);
        await updateMainRoomAdmin(newAdminId, roomName);
        io.to(roomName).emit("room-admin-update", newAdminId);
      }
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("user-leaving", () => {
    console.log("user leaving socket data:", socket.data);
    const roomName = socket.data.roomName;
    const roomUsers = rooms.get(roomName);
    console.log("User disconnected");
    handleUserLeave(socket);
    if (roomUsers) {
      console.log(
        `3Room ${roomName} after leaving users:`,
        [...roomUsers.values()].map((u) => `${u.userId} (${u.peerId})`)
      );
    } else {
      console.log(`roomUsers with roomName ${roomName} does not exist`);
    }
  });

  async function handleUserLeave(socket) {
    try {
      const roomName = socket.data.roomName.roomId;
      const userId = socket.data.userId;
      const peerId = socket.data.peerId;
      console.log(
        "socket roomName, userId, peerId: ",
        roomName,
        userId,
        peerId
      );
      if (roomName && userId) {
        await removeUserFromMainRoom(roomName, userId);
      }
      if (!roomName || !userId || !peerId) return;
      console.log("rooms.has(roomName): ", rooms.has(roomName));
      if (rooms.has(roomName)) {
        const roomUsers = rooms.get(roomName);
        if (roomUsers.has(userId)) {
          roomUsers.delete(userId);
          socket
            .to(roomName)
            .emit("user-disconnected-mainRoom", peerId, userId);

          console.log(`User ${userId} removed from room ${roomName}`);
        }

        // 如果該房間已無任何使用者，移除該房間
        if (roomUsers.size === 0) {
          rooms.delete(roomName);
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  // 加入房間
  socket.on("user-join-request", (payload, roomName) => {
    console.log("user-join-request in:", roomName);
    socket.join(roomName);
    socket.to(roomName).emit("user-join-request", payload, roomName);
  });

  socket.on("reject-join-request", (roomName) => {
    socket.to(roomName).emit("reject-join-request", { reject: true });
  });

  socket.on("accept-join-request", (roomName) => {
    socket.to(roomName).emit("accept-join-request", { accept: true });
  });
}
