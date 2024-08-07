import {
  ImageSegmenter,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2";
import { addVideoStream } from "./script.js"; // Ensure this import is correct

let imageSegmenter;
let labels;
let webcamRunning = false;
let runningMode = "VIDEO";
let applyBackgroundReplacement = false;
let lastStreamUpdate = 0;
const canvasElement = document.createElement("canvas");
const canvasCtx = canvasElement.getContext("2d");

let backgroundImage = new Image();
backgroundImage.src = "/static/images/bgs/bg-1.jpeg";

// Function to create image segmenter
const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true,
});

// 取得自己視訊的stream，包含畫面和聲音！
let myStream = await convertCanvasToStream(canvasElement);
let localVideo = document.createElement("video");
localVideo.classList.add("local-stream");
localVideo.classList.add("invert-screen");
localVideo.muted = true;

localVideo.srcObject = stream;
localVideo.play();

export const initializeSegmenter = async () => {
  await createImageSegmenter();
  startBackgroundEffects();
};

localVideo.addEventListener("loadedmetadata", () => {
  canvasElement.width = localVideo.videoWidth;
  canvasElement.height = localVideo.videoHeight;
  initializeSegmenter();
});

const createImageSegmenter = async () => {
  const audio = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm"
  );

  imageSegmenter = await ImageSegmenter.createFromOptions(audio, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/1/deeplab_v3.tflite",
      delegate: "GPU",
    },
    runningMode: runningMode,
    outputCategoryMask: true,
    outputConfidenceMasks: false,
  });
  labels = imageSegmenter.getLabels();
};

let lastWebcamTime = -1;
async function predictWebcam() {
  canvasCtx.drawImage(
    localVideo,
    0,
    0,
    localVideo.videoWidth,
    localVideo.videoHeight
  );

  if (imageSegmenter && runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await imageSegmenter.setOptions({ runningMode: "VIDEO" });
  }

  if (imageSegmenter) {
    let startTimeMs = performance.now();
    imageSegmenter.segmentForVideo(localVideo, startTimeMs, callbackForVideo);
  } else {
    if (webcamRunning) {
      setTimeout(predictWebcam);
    }
  }

  // 新增: 定期更新 stream
  if (performance.now() - lastStreamUpdate > 1000) {
    // 每秒更新一次
    myStream = await convertCanvasToStream(canvasElement);
    updateStreamForPeers(myStream);
    lastStreamUpdate = performance.now();
  }
}

function callbackForVideo(result) {
  let imageData = canvasCtx.getImageData(
    0,
    0,
    localVideo.videoWidth,
    localVideo.videoHeight
  );
  let pixels = imageData.data;
  const mask = result.categoryMask.getAsFloat32Array();

  if (applyBackgroundReplacement) {
    let tempCanvas = document.createElement("canvas");
    tempCanvas.width = localVideo.videoWidth;
    tempCanvas.height = localVideo.videoHeight;
    let tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(
      backgroundImage,
      0,
      0,
      localVideo.videoWidth,
      localVideo.videoHeight
    );
    let bgImageData = tempCtx.getImageData(
      0,
      0,
      localVideo.videoWidth,
      localVideo.videoHeight
    ).data;

    for (let i = 0; i < mask.length; i++) {
      let pixelIndex = i * 4;
      if (mask[i] > 0.001) {
        // 保持前景
      } else {
        // 替換背景
        pixels[pixelIndex] = bgImageData[pixelIndex];
        pixels[pixelIndex + 1] = bgImageData[pixelIndex + 1];
        pixels[pixelIndex + 2] = bgImageData[pixelIndex + 2];
        pixels[pixelIndex + 3] = bgImageData[pixelIndex + 3];
      }
    }

    for (let y = 1; y < localVideo.videoHeight - 1; y++) {
      for (let x = 1; x < localVideo.videoWidth - 1; x++) {
        let i = y * localVideo.videoWidth + x;
        if (Math.abs(mask[i] - 0.2) < 0.1) {
          let pixelIndex = i * 4;
          for (let c = 0; c < 3; c++) {
            pixels[pixelIndex + c] =
              0.5 * pixels[pixelIndex + c] + 0.5 * bgImageData[pixelIndex + c];
          }
        }
      }
    }
  }

  canvasCtx.putImageData(imageData, 0, 0);
  if (webcamRunning === true) {
    // https://github.com/google-ai-edge/mediapipe/issues/3018
    window.requestAnimationFrame(predictWebcam);
  }
}

export async function startBackgroundEffects() {
  if (!canvasElement.parentNode) {
    const videoContainer = document.querySelector(".video-stream");
    videoContainer.appendChild(canvasElement);
  }
  webcamRunning = true;
  predictWebcam();

  // 新增: 更新 stream 並通知 peers
  myStream = await convertCanvasToStream(canvasElement);
  updateStreamForPeers(myStream);
}

async function convertCanvasToStream(canvas) {
  const videoOutput = await canvas.captureStream();
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

document.addEventListener("DOMContentLoaded", () => {
  if (!document.querySelector(".local-stream")) {
    addVideoStream(localVideo, myStream, "local");
  }
});

document.querySelector(".bg-1").addEventListener("click", () => {
  applyBackgroundReplacement = true;
});

document.querySelector(".none-blur-bg").addEventListener("click", () => {
  applyBackgroundReplacement = false;
});

// 2. 添加 updateStreamForPeers 函數
function updateStreamForPeers(newStream) {
  for (let userId in window.peers) {
    const sender = window.peers[userId].peerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    if (sender) {
      sender.replaceTrack(newStream.getVideoTracks()[0]);
    }
  }
}
export { myStream };
