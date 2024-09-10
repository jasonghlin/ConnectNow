function roomTime() {
  const now = new Date();
  const noon = document.querySelector(".morning-afternoon");
  const hour = document.querySelector(".hour");
  const minute = document.querySelector(".minute");

  if (!noon || !hour || !minute) {
    console.error("一個或多個元素不存在於 DOM 中");
    return; // 如果元素不存在，不繼續執行
  }

  // 判斷上午或下午
  noon.textContent = now.getHours() < 12 ? "上午" : "下午";

  // 處理 12 小時制邏輯，正午和午夜的特殊情況
  let displayHour = now.getHours() % 12;
  displayHour = displayHour === 0 ? 12 : displayHour; // 如果是 0 (午夜) 則顯示為 12

  hour.textContent = displayHour < 10 ? `0${displayHour}` : displayHour;

  // 處理分鐘部分
  const minutes = now.getMinutes();
  minute.textContent = minutes < 10 ? `0${minutes}` : minutes;
}

// 初始設定顯示時間
roomTime();

// 每分鐘更新一次時間
setInterval(roomTime, 1000); // 每 60000 毫秒（1 分鐘）更新一次
