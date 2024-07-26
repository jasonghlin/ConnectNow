import { checkStatus } from "../utils/loginOutAndRegister";

async function main() {
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
    if (!token) {
      alert("請先登入");
      return;
    }
    try {
      const roomIdResponse = await fetch("/api/roomId");
      if (!roomIdResponse.ok) {
        throw new Error("Failed to fetch roomId");
      }

      const roomId = await roomIdResponse.json();
      const insertUserRoomResponse = await fetch("/api/createMainRoom", {
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
