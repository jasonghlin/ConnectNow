function date() {
  const now = new Date();
  const noon = document.querySelector(".noon");
  const hour = document.querySelector(".hour");
  const minutes = document.querySelector(".minutes");
  const month = document.querySelector(".month");
  const date = document.querySelector(".date");
  const day = document.querySelector(".day");

  // 判斷上午或下午
  noon.textContent = now.getHours() >= 12 ? "下午" : "上午";

  // 處理12小時制的邏輯，避免 0 AM 顯示
  let displayHour = now.getHours() % 12;
  displayHour = displayHour === 0 ? 12 : displayHour;
  hour.textContent = displayHour < 10 ? `0${displayHour}` : displayHour;

  // 處理分鐘的格式
  const displayMinutes = now.getMinutes();
  minutes.textContent =
    displayMinutes < 10 ? `0${displayMinutes}` : displayMinutes;

  // 顯示月份
  month.textContent = now.getMonth() + 1;

  // 顯示日期
  date.textContent = now.getDate();

  // 顯示星期
  const days = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
  day.textContent = days[now.getDay()];
}

// 初始更新顯示時間
date();

// 每分鐘更新一次時間
setInterval(date, 1000);

export { date };
