import { checkStatus } from "/static/utils/loginOutAndRegister.js";
import { date } from "/static/utils/date.js";

async function routerRoom() {
  date();
  const payload = await checkStatus();
  let userImgUrl = localStorage.getItem("proImg");
  if (payload && !userImgUrl) {
    let response = await fetch("/api/userImg", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("session")}`,
      },
    });
    if (response.ok) {
      // 確保請求成功
      const data = await response.json();
      console.log(data); // 檢查返回的數據格式
      userImgUrl = data.url || "/static/images/user.png"; // 確保 url 存在
    } else {
      console.error("Failed to fetch user image");
      userImgUrl = "/static/images/user.png"; // 默認圖片
    }
  } else if (!userImgUrl) {
    userImgUrl = "/static/images/user.png"; // 默認圖片
  }
  if (payload) {
    document.querySelector(
      ".login-register"
    ).innerHTML = `<div class="userInfo-img-container">
                    <div class="user-welcome">
                        <div class="user-name">${payload.payload.userName}</div>
                        <div class="welcome">歡迎使用 Connect Now</div>
                    </div>
                    <div class="user-img">
                        <img src="${userImgUrl}" alt="user-img">
                    </div>
                </div>`;
    document.querySelector(".login-register").addEventListener("click", (e) => {
      window.location.href = "/member";
    });
  }

  const createRoomBtn = document.querySelector(".create-room-btn");
  const joinRoomBtn = document.querySelector(".join-room-btn");

  if (!createRoomBtn || !joinRoomBtn) {
    console.error("Buttons not found in the DOM"); // 確認按鈕存在
    return;
  }

  createRoomBtn.addEventListener("click", async () => {
    const payload = await checkStatus();
    if (!payload) {
      Swal.fire("請先登入");
      return;
    }

    const token = localStorage.getItem("session");
    // if (!token) {
    //   alert("請先登入");
    //   return;
    // }
    try {
      const createRoomId = await fetch("/api/mainRoom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!createRoomId.ok) {
        throw new Error("Failed to create main room");
      }
      const roomId = await createRoomId.json();

      window.location.href = `/roomId/${roomId.roomId}`;
    } catch (error) {
      console.error("Error:", error);
      Swal.fire("Failed to create room. Please try again.");
    }
  });

  joinRoomBtn.addEventListener("click", async () => {
    const roomId = document.getElementById("room-number").value;
    const payload = await checkStatus();
    if (!payload) {
      Swal.fire("請先登入");
      return;
    }

    const token = localStorage.getItem("session");
    if (!token) {
      Swal.fire("請先登入");
      return;
    }

    try {
      if (roomId) {
        if (roomId.startsWith("https://") || roomId.startsWith("http://")) {
          window.location.href = roomId;
        } else {
          window.location.href = `/roomId/${roomId}`;
        }
      } else {
        Swal.fire("請輸入正確的會議代碼或連結");
      }
    } catch (error) {
      console.error("Error:", error);
      Swal.fire("請輸入正確的會議代碼或連結");
    }
  });
}

routerRoom();