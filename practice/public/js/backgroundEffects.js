// backgroundEffects.js
import {
  ImageSegmenter,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2";

let imageSegmenter;
let labels;
let webcamRunning = false;
let runningMode = "IMAGE";
let localVideo;
const canvasElement = document.createElement("canvas");
const canvasCtx = canvasElement.getContext("2d");

let backgroundImage = new Image();
backgroundImage.src = "/static/images/bgs/bg-1.jpeg";

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

let lastWebcamTime = -1;
async function predictWebcam() {
  if (localVideo.currentTime === lastWebcamTime) {
    if (webcamRunning === true) {
      window.requestAnimationFrame(predictWebcam);
    }
    return;
  }
  lastWebcamTime = localVideo.currentTime;
  canvasCtx.drawImage(
    localVideo,
    0,
    0,
    localVideo.videoWidth,
    localVideo.videoHeight
  );
  if (imageSegmenter === undefined) {
    return;
  }
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await imageSegmenter.setOptions({
      runningMode: runningMode,
    });
  }
  let startTimeMs = performance.now();
  imageSegmenter.segmentForVideo(localVideo, startTimeMs, callbackForVideo);
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

  canvasCtx.putImageData(imageData, 0, 0);
  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}

export function startBackgroundEffects() {
  if (!canvasElement.parentNode) {
    const videoContainer = document.querySelector(".video-stream");
    videoContainer.appendChild(canvasElement);
  }
  localVideo = document.querySelector(".local-stream");
  localVideo.classList.add("hidden");
  canvasElement.width = localVideo.videoWidth;
  canvasElement.height = localVideo.videoHeight;
  webcamRunning = true;
  predictWebcam();
}
