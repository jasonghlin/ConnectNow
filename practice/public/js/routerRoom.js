import { checkStatus } from "../utils/loginOutAndRegister.js";

async function routerRoom() {
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
      if (roomId) {
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

routerRoom();
