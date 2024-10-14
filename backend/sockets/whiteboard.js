export default function socketWhiteboard(io, socket, redisClient) {
  // 處理請求白板狀態
  socket.on("request-whiteboard-state", async (roomId) => {
    try {
      const whiteboardState = await redisClient.lRange(
        `whiteboard:${roomId}`,
        0,
        -1
      );
      const parsedState = whiteboardState.map((line) => JSON.parse(line));
      socket.emit("current-whiteboard-state", parsedState);
    } catch (error) {
      console.error(error);
    }
  });

  // 處理繪畫動作
  socket.on("draw", async (data) => {
    const lockKey = `whiteboard-lock:${data.roomId}`;
    const lockTimeout = 5000; // 5秒鎖超時
    const uniqueLockValue = `${socket.id}:${Date.now()}`; // 唯一值，避免鎖被其他連接解鎖

    try {
      // 獲取鎖 (使用 setnx 確保只有一個 socket 能獲取鎖)
      const lockAcquired = await redisClient.set(lockKey, uniqueLockValue, {
        NX: true, // 只有當 key 不存在時才能設置成功
        PX: lockTimeout, // 設置鎖的過期時間，避免死鎖
      });

      if (!lockAcquired) {
        console.log("Failed to acquire lock, another user is drawing.");
        return; // 若無法獲取鎖，返回，避免 race condition
      }

      // 使用 MULTI 開啟交易
      const multi = redisClient.multi();

      // 在交易中添加操作，將繪畫資料推入 Redis 列表
      multi.rPush(`whiteboard:${data.roomId}`, JSON.stringify(data));

      // 提交交易
      await multi.exec();

      // 廣播繪畫動作給其他用戶
      socket.to(data.roomId).emit("draw", data);
    } catch (error) {
      console.error("Error saving whiteboard data to Redis:", error);
    } finally {
      // 無論是否成功，都要釋放鎖
      const currentLockValue = await redisClient.get(lockKey);
      if (currentLockValue === uniqueLockValue) {
        await redisClient.del(lockKey); // 釋放鎖
      }
    }
  });

  // 處理清除白板
  socket.on("clear-whiteboard", async (roomId) => {
    try {
      // 使用 Redis transaction 清空白板
      await redisClient
        .multi()
        .del(`whiteboard:${roomId}`)
        .del(`whiteboard-lock:${roomId}`)
        .exec();

      // 廣播清除指令給其他用戶
      socket.to(roomId).emit("clear-whiteboard");
    } catch (error) {
      console.error("Error clearing whiteboard data from Redis:", error);
    }
  });

  // 處理用戶離開房間時的清理（可選）
  socket.on("disconnect", () => {
    // 可以在這裡添加用戶離線的處理邏輯
  });
}
