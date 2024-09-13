export default function socketChat(io, socket, redisClient) {
  // chat panel
  socket.on("send-message", async ({ roomId: roomName, message, userName }) => {
    console.log(roomName);
    if (message && message.trim() !== "") {
      const chatMessage = { userName, message };
      console.log(chatMessage);
      // 將訊息存到 Redis
      await redisClient.rPush(`chat:${roomName}`, JSON.stringify(chatMessage));

      // Emit the message to all users in the room
      io.to(roomName).emit("receive-message", chatMessage);
    }
  });

  // 從 Redis 讀取特定會議室的 chat
  socket.on("load-chat", async (roomName, callback) => {
    const messages = await redisClient.lRange(`chat:${roomName}`, 0, -1);
    const parsedMessages = messages.map((msg) => JSON.parse(msg));
    callback(parsedMessages);
  });
}
