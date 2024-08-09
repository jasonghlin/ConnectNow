function date() {
  const now = new Date();
  const noon = document.querySelector(".noon");
  const hour = document.querySelector(".hour");
  const minutes = document.querySelector(".minutes");
  const month = document.querySelector(".month");
  const date = document.querySelector(".date");
  const day = document.querySelector(".day");
  console.log(now.getDate());
  noon.textContent = now.getHours() > 12 ? "下午" : "上午";
  hour.textContent =
    now.getHours() > 12 ? `0${now.getHours() - 12}` : now.getHours();
  minutes.textContent =
    now.getMinutes() < 9 ? `0${now.getMinutes()}` : now.getMinutes();
  month.textContent = now.getMonth();
  date.textContent = now.getDate();
  switch (now.getDay()) {
    case 1:
      day.textContent = "週一";
      break;
    case 2:
      day.textContent = "週二";
      break;
    case 3:
      day.textContent = "週三";
      break;
    case 4:
      day.textContent = "週四";
      break;
    case 5:
      day.textContent = "週五";
      break;
    case 6:
      day.textContent = "週六";
      break;
    case 7:
      day.textContent = "週日";
      break;
  }
}
export { date };
