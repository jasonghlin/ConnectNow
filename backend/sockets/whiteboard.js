export default function socketWhiteboard(io, socket, redisClient) {
  // whiteBoard

  socket.on("request-whiteboard-state", async (roomName) => {
    try {
      const whiteboardState = await redisClient.lRange(
        `whiteboard:${roomName}`,
        0,
        -1
      );
      const parsedState = whiteboardState.map((line) => JSON.parse(line));

      // 获取当前版本号
      const currentVersion = await redisClient.get(
        `whiteboard_version:${roomName}`
      );
      const version = currentVersion != null ? parseInt(currentVersion) : 0;

      // 发送白板状态和版本号
      socket.emit("current-whiteboard-state", { parsedState, version });
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("draw", async (data) => {
    try {
      const { roomId, version } = data;
      const currentVersion = await redisClient.get(
        `whiteboard_version:${roomId}`
      );

      // 如果版本号不存在，初始化为 0
      if (currentVersion == null) {
        await redisClient.set(`whiteboard_version:${roomId}`, 0);
        data.version = 0;
      }

      // 仅当版本号匹配时才处理绘制操作
      if (parseInt(currentVersion) === version) {
        await redisClient.rPush(`whiteboard:${roomId}`, JSON.stringify(data));
        await redisClient.expire(`whiteboard:${roomId}`, 24 * 60 * 60);
        socket.to(roomId).emit("draw", data);
      } else {
        console.warn(
          `Version mismatch for room ${roomId}: data version ${version}, current version ${currentVersion}`
        );
      }
    } catch (error) {
      console.error("Error saving whiteboard data to Redis:", error);
    }
  });

  socket.on("clear-whiteboard", async (roomName) => {
    try {
      // 递增版本号
      await redisClient.incr(`whiteboard_version:${roomName}`);
      // 删除白板数据
      await redisClient.del(`whiteboard:${roomName}`);
      // 通知房间内的其他用户
      socket.to(roomName).emit("clear-whiteboard");
    } catch (error) {
      console.error("Error clearing whiteboard data from Redis:", error);
    }
  });
}
