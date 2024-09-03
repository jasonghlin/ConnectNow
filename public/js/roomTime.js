function roomTime() {
  const now = new Date();
  const noon = document.querySelector(".morning-afternoon");
  const hour = document.querySelector(".hour");
  const minute = document.querySelector(".minute");
  noon.textContent = new Date().getHours < 12 ? "上午" : "下午";
  hour.textContent =
    now.getHours() > 12
      ? now.getHours() - 12 < 10
        ? `0${now.getHours() - 12}`
        : now.getHours() - 12
      : now.getHours();

  minute.textContent =
    new Date().getMinutes() < 10
      ? `0${new Date().getMinutes()}`
      : new Date().getMinutes();
}

roomTime();
