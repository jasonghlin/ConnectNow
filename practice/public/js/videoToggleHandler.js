import { switchStream } from "./script.js";

let videoEnabled = true;
let myStream = null;
let blackStream = null;
let blackStreamId = null;
let originalVideoTrack = null;

export const toggleVideo = async (
  localStream,
  canvasElement,
  peers,
  socket,
  myPeerId
) => {
  videoEnabled = !videoEnabled;

  const videoIcon = document.querySelector(".video i");
  if (videoEnabled) {
    try {
      videoIcon.classList.remove("fa-video-slash");
      videoIcon.classList.add("fa-video");
      myStream = await convertCanvasToStream(canvasElement);
      if (myStream) {
        switchStream(myStream);
      } else {
        console.error("Failed to get a valid stream from canvas.");
      }
    } catch (error) {
      console.error("Error capturing stream from canvas:", error);
    }
  } else {
    videoIcon.classList.remove("fa-video");
    videoIcon.classList.add("fa-video-slash");
    // Store the original video track
    originalVideoTrack = localStream.getVideoTracks()[0];

    // Create a black canvas
    const blackCanvas = document.createElement("canvas");
    blackCanvas.width = canvasElement.width;
    blackCanvas.height = canvasElement.height;
    const ctx = blackCanvas.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, blackCanvas.width, blackCanvas.height);

    // Convert the black canvas to a stream
    blackStream = blackCanvas.captureStream();
    blackStreamId = `black-stream-${Date.now()}`;

    // Add audio tracks from the original stream to the black stream
    if (localStream && localStream.getAudioTracks) {
      localStream
        .getAudioTracks()
        .forEach((track) => blackStream.addTrack(track));
    }

    switchStream(blackStream);
    updateLocalVideoDisplay(blackStream, canvasElement);
  }

  for (let userId in peers) {
    const sender = peers[userId].peerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    if (sender) {
      sender
        .replaceTrack(
          videoEnabled
            ? myStream.getVideoTracks()[0]
            : blackStream.getVideoTracks()[0]
        )
        .catch((error) => {
          console.error("Error replacing track:", error);
        });
    }
  }

  updateStreamForPeers(videoEnabled ? myStream : blackStream, peers);
  socket.emit(
    "update-stream",
    myPeerId,
    videoEnabled ? myStream.id : blackStreamId,
    false
  );
};

function updateLocalVideoDisplay(stream, canvasElement) {
  const localVideo = document.querySelector(".local-stream");
  if (localVideo) {
    localVideo.srcObject = stream;
  }

  const ctx = canvasElement.getContext("2d");
  const videoTrack = stream.getVideoTracks()[0];

  if (videoTrack) {
    const videoElement = document.createElement("video");
    videoElement.srcObject = new MediaStream([videoTrack]);
    videoElement.play();

    videoElement.onloadedmetadata = () => {
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;

      function drawVideo() {
        ctx.drawImage(
          videoElement,
          0,
          0,
          canvasElement.width,
          canvasElement.height
        );
        requestAnimationFrame(drawVideo);
      }
      drawVideo();
    };
  } else {
    // If there's no video track (black screen), fill the canvas with black
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
  }
}

async function convertCanvasToStream(canvas) {
  const videoOutput = canvas.captureStream();
  const mic = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false,
  });
  const combine = new MediaStream([
    ...videoOutput.getTracks(),
    ...mic.getTracks(),
  ]);
  return combine;
}

function updateStreamForPeers(newStream, peers) {
  for (let userId in peers) {
    const sender = peers[userId].peerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    if (sender) {
      sender.replaceTrack(newStream.getVideoTracks()[0]).catch((error) => {
        console.error("Error replacing track:", error);
      });
    }
  }
}
