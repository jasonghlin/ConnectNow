export default function socketVideoRecord(io, socket) {
  socket.on("start-recording", (roomName) => {
    io.to(roomName).emit("start-recording");
  });

  socket.on("stop-recording", (roomName) => {
    io.to(roomName).emit("stop-recording");
  });
}
