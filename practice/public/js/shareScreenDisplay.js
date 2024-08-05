// shareScreenDisplay.js
import { shareScreen, resetShareMediaStream } from "./shareScreen.js";
import { switchStream, localStream } from "./script.js";

const toggleRemoteVideosVisibility = (isHidden) => {
  const remoteVideos = document.querySelectorAll("video");
  remoteVideos.forEach((video) => {
    if (!video.classList.contains("local-stream")) {
      if (isHidden) {
        video.style.display = "none";
      } else {
        video.style.display = "";
      }
    }
  });
};

// 事件監聽器：分享螢幕
document.querySelector(".share-screen").addEventListener("click", async (e) => {
  try {
    const screenStream = await shareScreen();
    switchStream(screenStream, true);
    toggleRemoteVideosVisibility(true); // 隐藏其他视频

    // 當分享結束時恢復本地視訊流
    screenStream.getVideoTracks()[0].addEventListener("ended", () => {
      switchStream(localStream);
      resetShareMediaStream();
      toggleRemoteVideosVisibility(false); // 显示其他视频

      // 恢复所有视频的 .invert-screen 样式
      const allVideos = document.querySelectorAll("video");
      allVideos.forEach((video) => {
        if (video.classList.contains("local-stream")) {
          video.classList.add("invert-screen");
        } else {
          video.classList.remove("invert-screen");
        }
      });
    });
  } catch (err) {
    console.error("Error sharing screen or user cancelled:", err);
    // 如果分享取消，恢復原本的視訊流
    switchStream(localStream);
  }
});
