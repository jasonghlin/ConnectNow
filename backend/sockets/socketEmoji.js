export default function socketEmoji(io, socket) {
  // emoji
  socket.on("emoji-selected", (emoji, roomName) => {
    // 廣播給所有其他使用者
    console.log("emoji-selected: ", roomName);
    io.to(roomName).emit("emoji-selected", emoji);
  });
}
