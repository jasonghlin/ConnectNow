import { socket, roomId } from "./script.js";

document.querySelector(".emoji-icon").addEventListener("click", function () {
  const emojiPicker = document.getElementById("emoji-picker");
  const emojiButton = this;

  // 設置 emoji-picker 的位置
  const rect = emojiButton.getBoundingClientRect();
  emojiPicker.style.left = `${rect.left + rect.width / 2}px`;
  emojiPicker.style.bottom = `${window.innerHeight - rect.top + 10}px`; // 顯示在按鈕上方

  // 切換顯示狀態
  emojiPicker.style.display =
    emojiPicker.style.display === "none" ? "block" : "none";
});

const emojis = document.querySelectorAll(".emoji");
emojis.forEach((emoji) => {
  emoji.addEventListener("click", () => {
    const selectedEmoji = emoji.textContent;
    sendEmojiToAllUsers(selectedEmoji); // 傳送 emoji 給所有使用者
    document.getElementById("emoji-picker").style.display = "none";
  });
});

function sendEmojiToAllUsers(emoji) {
  socket.emit("emoji-selected", emoji, roomId);
}

socket.on("emoji-selected", (emoji) => {
  displayEmoji(emoji);
});

function displayEmoji(emoji) {
  const emojiElement = document.createElement("div");
  emojiElement.style.marginLeft = "20px";
  emojiElement.classList.add("floating-emoji");
  emojiElement.textContent = emoji;
  document.body.appendChild(emojiElement);

  // 加入動畫效果
  emojiElement.animate(
    [
      { transform: "translateY(0)", opacity: 1 },
      { transform: "translateY(-500px)", opacity: 0 },
    ],
    {
      duration: 5000,
      easing: "ease-out",
    }
  );

  // 兩秒後移除元素
  setTimeout(() => {
    document.body.removeChild(emojiElement);
  }, 2000);
}
