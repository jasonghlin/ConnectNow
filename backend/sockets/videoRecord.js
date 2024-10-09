export default function socketVideoRecord(io, socket) {
  socket.on("start-recording", (roomName) => {
    console.log(`Ｒeceived start-recording event for room: ${roomName}`);
    io.to(roomName).emit("start-recording");
  });

  socket.on("stop-recording", (roomName) => {
    console.log(`Ｒeceived stop-recording event for room: ${roomName}`);
    io.to(roomName).emit("stop-recording");
  });
}
