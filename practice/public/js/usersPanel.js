// users panel
async function updateUsersList() {
  const participantsList = document.querySelector(".users-content");
  participantsList.innerHTML = "";
  const token = localStorage.getItem("session");
  try {
    const usersResponse = await fetch("/api/allUsers", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const usersList = await usersResponse.json();
    usersList.forEach((user) => {
      const html = `<div class="user-container">
      <div class="avatar">
          <img src="${user.avatar_url || "/static/images/user.png"}" alt="">
      </div>
      <div class="user-name">${user.name}</div>
  </div>`;

      participantsList.insertAdjacentHTML("beforeend", html);
    });
  } catch (error) {
    console.error("Error fetching users:", error);
  }
}

function usersPanelDisplay() {
  const usersButton = document.querySelector(".participants");
  const usersPanel = document.getElementById("users-panel");
  const closeUsersButton = document.getElementById("close-users");
  const body = document.body;

  usersButton.addEventListener("click", () => {
    usersPanel.classList.add("show");
    body.classList.add("panel-open");
    updateUsersList(); // 每次打開面板時更新用戶列表
  });

  closeUsersButton.addEventListener("click", () => {
    usersPanel.classList.remove("show");
    body.classList.remove("panel-open");
  });
}
usersPanelDisplay();
