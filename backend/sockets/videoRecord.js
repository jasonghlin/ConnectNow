export default function socketVideoRecord(io, socket) {
  socket.on("start-recording", (roomName) => {
    console.log("received start-recording");
    io.to(roomName).emit("start-recording");
  });

  socket.on("stop-recording", (roomName) => {
    console.log("received stop-recording");
    io.to(roomName).emit("stop-recording");
  });
}
