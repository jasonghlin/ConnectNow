import { checkStatus } from "../utils/loginOutAndRegister.js";
import { date } from "../utils/date.js";

async function main() {
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
                        <div class="welcome">歡迎使用 ConnectNow</div>
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
      alert("請先登入");
      return;
    }

    const token = localStorage.getItem("session");
    // if (!token) {
    //   alert("請先登入");
    //   return;
    // }
    try {
      const roomIdResponse = await fetch("/api/roomId");
      if (!roomIdResponse.ok) {
        throw new Error("Failed to fetch roomId");
      }

      const roomId = await roomIdResponse.json();
      const insertUserRoomResponse = await fetch("/api/mainRoom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userInfo: payload.payload, roomId }),
      });

      if (!insertUserRoomResponse.ok) {
        throw new Error("Failed to create main room");
      }
      console.log(roomId);
      window.location.href = `/roomId/${roomId}`;
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to create room. Please try again.");
    }
  });

  joinRoomBtn.addEventListener("click", async () => {
    const roomId = document.getElementById("room-number").value;
    const payload = await checkStatus();
    if (!payload) {
      alert("請先登入");
      return;
    }

    const token = localStorage.getItem("session");
    if (!token) {
      alert("請先登入");
      return;
    }

    try {
      let response = await fetch(`/roomIdServer/${roomId}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      let roomIdServer = await response.json();
      console.log(roomIdServer);
      if (roomIdServer && Object.keys(roomIdServer).length > 0) {
        window.location.href = `/roomId/${roomId}`;
      } else {
        alert("請輸入正確的會議代碼或連結");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("請輸入正確的會議代碼或連結");
    }
  });
}

main();
date();
