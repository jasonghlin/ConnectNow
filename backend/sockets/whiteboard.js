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
      socket.emit("current-whiteboard-state", parsedState);
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("draw", async (data) => {
    try {
      await redisClient.rPush(
        `whiteboard:${data.roomId}`,
        JSON.stringify(data)
      );
      socket.to(data.roomId).emit("draw", data);
    } catch (error) {
      console.error("Error saving whiteboard data to Redis:", error);
    }
  });

  socket.on("clear-whiteboard", async (roomName) => {
    try {
      await redisClient.del(`whiteboard:${roomName}`);
      socket.to(roomName).emit("clear-whiteboard");
    } catch (error) {
      console.error("Error clearing whiteboard data from Redis:", error);
    }
  });
}
