import {
  ImageSegmenter,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2";
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("canvas");
const canvasCtx = canvasElement.getContext("2d");
const webcamPredictions = document.getElementById("webcamPredictions");
const demosSection = document.getElementById("demos");
let enableWebcamButton;
let webcamRunning = false;
const videoHeight = "360px";
const videoWidth = "480px";
let runningMode = "IMAGE";
const resultWidthHeigth = 256;

let imageSegmenter;
let labels;

let backgroundImage = new Image();
backgroundImage.src = "./images/bgs/bg-1.jpeg";

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
createImageSegmenter();

// Check if webcam access is supported.
// function hasGetUserMedia() {
//   return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
// }

// Get segmentation from the webcam
let lastWebcamTime = -1;
async function predictWebcam() {
  if (video.currentTime === lastWebcamTime) {
    if (webcamRunning === true) {
      window.requestAnimationFrame(predictWebcam);
    }
    return;
  }
  lastWebcamTime = video.currentTime;
  canvasCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
  // Do not segmented if imageSegmenter hasn't loaded
  if (imageSegmenter === undefined) {
    return;
  }
  // if image mode is initialized, create a new segmented with video runningMode
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await imageSegmenter.setOptions({
      runningMode: runningMode,
    });
  }
  let startTimeMs = performance.now();

  // Start segmenting the stream.
  imageSegmenter.segmentForVideo(video, startTimeMs, callbackForVideo);
}

// Enable the live webcam view and start imageSegmentation.
async function enableCam(event) {
  if (imageSegmenter === undefined) {
    return;
  }

  if (webcamRunning === true) {
    webcamRunning = false;
    enableWebcamButton.innerText = "ENABLE SEGMENTATION";
  } else {
    webcamRunning = true;
    enableWebcamButton.innerText = "DISABLE SEGMENTATION";
  }

  // getUsermedia parameters.
  const constraints = {
    video: true,
  };

  // Activate the webcam stream.
  video.srcObject = await navigator.mediaDevices.getUserMedia(constraints);
  video.addEventListener("loadeddata", predictWebcam);
}

// If webcam supported, add event listener to button.
// if (hasGetUserMedia()) {
//   enableWebcamButton = document.getElementById("webcamButton");
enableWebcamButton.addEventListener("click", enableCam);
// } else {
//   console.warn("getUserMedia() is not supported by your browser");
// }

function callbackForVideo(result) {
  let imageData = canvasCtx.getImageData(
    0,
    0,
    video.videoWidth,
    video.videoHeight
  );
  let pixels = imageData.data;
  const mask = result.categoryMask.getAsFloat32Array();

  // 創建一個臨時畫布來繪製背景圖片
  let tempCanvas = document.createElement("canvas");
  tempCanvas.width = video.videoWidth;
  tempCanvas.height = video.videoHeight;
  let tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(backgroundImage, 0, 0, video.videoWidth, video.videoHeight);
  let bgImageData = tempCtx.getImageData(
    0,
    0,
    video.videoWidth,
    video.videoHeight
  ).data;

  for (let i = 0; i < mask.length; i++) {
    let pixelIndex = i * 4;
    if (mask[i] > 0.001) {
      // 調整這個閾值以獲得更好的分割效果
      // 保持原始顏色不變（這是前景/人物）
      // 不需要做任何改變，因為 pixels 已經包含了原始圖像數據
    } else {
      // 用背景圖片的相應像素替換（這是背景）
      pixels[pixelIndex] = bgImageData[pixelIndex];
      pixels[pixelIndex + 1] = bgImageData[pixelIndex + 1];
      pixels[pixelIndex + 2] = bgImageData[pixelIndex + 2];
      pixels[pixelIndex + 3] = bgImageData[pixelIndex + 3];
    }
  }

  // 可選：增加邊緣平滑處理
  for (let y = 1; y < video.videoHeight - 1; y++) {
    for (let x = 1; x < video.videoWidth - 1; x++) {
      let i = y * video.videoWidth + x;
      if (Math.abs(mask[i] - 0.2) < 0.1) {
        // 在邊緣區域進行混合
        let pixelIndex = i * 4;
        for (let c = 0; c < 3; c++) {
          pixels[pixelIndex + c] =
            0.5 * pixels[pixelIndex + c] + 0.5 * bgImageData[pixelIndex + c];
        }
      }
    }
  }

  canvasCtx.putImageData(imageData, 0, 0);
  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}
