import { updateVideoLayout } from "./videoLayout.js";

let screenStream = null;
let originalStream = null;

export async function startScreenShare() {
  try {
    // 動態載入 script.js 中的變數和函數
    const { socket, peerInstance, myPeerId, currentStream } = await import(
      "./script.js"
    );

    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    });
    originalStream = currentStream; // Store the original stream

    // Create a new video element for the screen share
    const screenVideoElement = document.createElement("video");
    screenVideoElement.srcObject = screenStream;
    screenVideoElement.autoplay = true;
    screenVideoElement.classList.add("screen-share");
    screenVideoElement.setAttribute("data-peer-id", myPeerId);
    screenVideoElement.setAttribute("video-share-peer-id", myPeerId);

    const screenWrapper = document.createElement("div");
    screenWrapper.classList.add("video-wrapper");
    screenWrapper.classList.add("screen-share");
    screenWrapper.setAttribute("data-peer-id", myPeerId);
    screenWrapper.setAttribute("video-share-peer-id", myPeerId);
    screenWrapper.appendChild(screenVideoElement);

    const maximizeButton = document.createElement("button");
    maximizeButton.classList.add("maximize-button");
    maximizeButton.setAttribute("data-peer-id", myPeerId);
    maximizeButton.innerText = "⤢";
    maximizeButton.addEventListener("click", () => {
      const isMainVideo =
        maximizeButton.parentElement.classList.toggle("main-video");
      console.log("startScreenShare function 1");
      updateVideoLayout();

      if (!isMainVideo) {
        // 如果 `main-video` 類別已被移除，執行額外的函式
        const localStream = document.querySelector(".local-stream");
        const videosElement = document.querySelectorAll(".video-wrapper");
        const videos = Array.from(videosElement);
        videos.unshift(localStream);
        videos.forEach((video) => {
          video.classList.remove("small-video");
          video.style = "";
        });
        console.log("startScreenShare function 2");
        updateVideoLayout();
      } else {
        maximizeButton.parentElement.classList.remove("small-video");
        maximizeButton.parentElement.style = "";
      }
    });
    screenWrapper.appendChild(maximizeButton);

    // Add the new video element to the page
    const videoContainer = document.querySelector(".video-stream");
    videoContainer.appendChild(screenWrapper);

    // Emit event to inform other users about screen sharing
    let roomId = window.location.pathname.split("/").pop();
    socket.emit("start-screen-share", roomId, myPeerId);
    console.log("startScreenShare function 2");
    updateVideoLayout();
    // Replace all existing peer connections with the screen stream
    const calls = peerInstance.connections;
    Object.values(calls).forEach((connections) => {
      connections.forEach((call) => {
        call.peerConnection.getSenders().forEach((sender) => {
          if (sender.track.kind === "video") {
            sender.replaceTrack(screenStream.getVideoTracks()[0]);
          }
        });
      });
    });

    // Handle the end of screen sharing
    screenStream.getVideoTracks()[0].onended = () => {
      stopScreenShare();
    };
  } catch (err) {
    console.error("Error starting screen share:", err);
  }
}

export async function stopScreenShare() {
  const { socket, roomId, peerInstance, myPeerId, currentStream } =
    await import("./script.js");
  if (screenStream) {
    screenStream.getTracks().forEach((track) => track.stop());

    // Remove the screen share video element
    const screenVideoElement = document.querySelector(
      ".video-wrapper.screen-share"
    );
    if (screenVideoElement) {
      screenVideoElement.remove();
    }

    // Emit event to inform other users about stopping screen sharing
    socket.emit("stop-screen-share", roomId, myPeerId);

    // Replace screen share stream with original stream in all peer connections
    const calls = peerInstance.connections;
    Object.values(calls).forEach((connections) => {
      connections.forEach((call) => {
        call.peerConnection.getSenders().forEach((sender) => {
          if (sender.track.kind === "video") {
            sender.replaceTrack(originalStream.getVideoTracks()[0]);
          }
        });
      });
    });

    screenStream = null;

    // Update the local video element to show the original stream
    const localVideo = document.querySelector(".local-stream");
    if (localVideo) {
      localVideo.srcObject = originalStream;
    }
  }
}

export function handleIncomingScreenShare(call) {
  call.answer(); // Answer the call without sending a stream back
  call.on("stream", (remoteStream) => {
    // Create a new video element for the remote screen share
    const remoteScreenVideo = document.createElement("video");
    remoteScreenVideo.srcObject = remoteStream;
    remoteScreenVideo.autoplay = true;
    remoteScreenVideo.classList.add("screen-share");
    remoteScreenVideo.setAttribute("data-peer-id", call.peer);
    remoteScreenVideo.setAttribute("video-share-peer-id", call.peer);

    // Add the new video element to the page
    const videoContainer = document.querySelector(".video-stream");
    videoContainer.appendChild(remoteScreenVideo);

    // Remove the video element when the call ends
    call.on("close", () => {
      remoteScreenVideo.remove();
    });
  });
}
