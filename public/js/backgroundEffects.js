import {
  ImageSegmenter,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2";

let imageSegmenter;
let labels;
let webcamRunning = false;
let runningMode = "VIDEO";

let lastStreamUpdate = 0;
const canvasElement = document.createElement("canvas");
const canvasCtx = canvasElement.getContext("2d");
let applyForegroundReplacement = false;
let applyForegroundBlur = false;

let foregroundImage = new Image();
foregroundImage.src = "/static/images/bgs/bg-1.jpeg";

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

const initializeSegmenter = async () => {
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
        "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite",
      delegate: "GPU",
    },
    runningMode: runningMode,
    outputCategoryMask: true,
    outputConfidenceMasks: true,
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

  if (applyForegroundReplacement) {
    let tempCanvas = document.createElement("canvas");
    tempCanvas.width = localVideo.videoWidth;
    tempCanvas.height = localVideo.videoHeight;
    let tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(
      foregroundImage,
      0,
      0,
      localVideo.videoWidth,
      localVideo.videoHeight
    );
    let fgImageData = tempCtx.getImageData(
      0,
      0,
      localVideo.videoWidth,
      localVideo.videoHeight
    ).data;

    for (let i = 0; i < mask.length; i++) {
      let pixelIndex = i * 4;
      if (mask[i] > 0.1) {
        // 替換前景
        pixels[pixelIndex] = fgImageData[pixelIndex];
        pixels[pixelIndex + 1] = fgImageData[pixelIndex + 1];
        pixels[pixelIndex + 2] = fgImageData[pixelIndex + 2];
        pixels[pixelIndex + 3] = fgImageData[pixelIndex + 3];
      } else {
        // 保持背景
      }
    }

    // 平滑邊緣
    for (let y = 1; y < localVideo.videoHeight - 1; y++) {
      for (let x = 1; x < localVideo.videoWidth - 1; x++) {
        let i = y * localVideo.videoWidth + x;
        if (Math.abs(mask[i] - 0.2) < 0.1) {
          let pixelIndex = i * 4;
          for (let c = 0; c < 3; c++) {
            pixels[pixelIndex + c] =
              0.5 * pixels[pixelIndex + c] + 0.5 * fgImageData[pixelIndex + c];
          }
        }
      }
    }
  }

  if (applyForegroundBlur) {
    applyBlurEffect(
      pixels,
      mask,
      localVideo.videoWidth,
      localVideo.videoHeight
    );
  }

  canvasCtx.putImageData(imageData, 0, 0);
  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
    // setTimeout(predictWebcam, 1000 / 120);
  }
}

async function startBackgroundEffects() {
  if (!canvasElement.parentNode) {
    const videoContainer = document.querySelector(".video-stream");
    videoContainer.appendChild(canvasElement);
    canvasElement.classList.add("local-stream");
    canvasElement.classList.add("invert-screen");
  }
  webcamRunning = true;
  predictWebcam();
}

function applyBlurEffect(pixels, mask, width, height) {
  let blurRadius = 10;
  let tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  let tempCtx = tempCanvas.getContext("2d");
  tempCtx.filter = `blur(${blurRadius}px)`;
  tempCtx.drawImage(canvasElement, 0, 0);
  let blurredImageData = tempCtx.getImageData(0, 0, width, height).data;

  for (let i = 0; i < mask.length; i++) {
    let pixelIndex = i * 4;
    if (mask[i] > 0.1) {
      pixels[pixelIndex] = blurredImageData[pixelIndex];
      pixels[pixelIndex + 1] = blurredImageData[pixelIndex + 1];
      pixels[pixelIndex + 2] = blurredImageData[pixelIndex + 2];
    }
  }
}

async function convertCanvasToStream(canvas, isMicMuted = false) {
  try {
    const videoOutput = await canvas.captureStream();
    if (!videoOutput.getTracks) {
      throw new Error(
        "Canvas captureStream did not return a valid MediaStream"
      );
    }

    // 創建一個翻轉的 canvas，用於發送視頻流
    const flippedCanvas = document.createElement("canvas");
    flippedCanvas.width = canvas.width;
    flippedCanvas.height = canvas.height;
    const flippedCtx = flippedCanvas.getContext("2d");

    // 每次繪製時將內容水平翻轉
    function flipCanvas() {
      flippedCtx.save();
      flippedCtx.scale(-1, 1); // 水平翻轉
      flippedCtx.drawImage(
        canvas,
        -canvas.width,
        0,
        canvas.width,
        canvas.height
      );
      flippedCtx.restore();
      requestAnimationFrame(flipCanvas); // 持續翻轉畫布
    }
    flipCanvas();

    const flippedStream = flippedCanvas.captureStream(); // 捕獲翻轉後的流

    const mic = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    // Mute or unmute the audio based on the isMicMuted parameter
    mic.getAudioTracks()[0].enabled = !isMicMuted;

    const combine = new MediaStream([
      ...flippedStream.getTracks(),
      ...mic.getTracks(),
    ]);
    return combine;
  } catch (error) {
    console.log(error);
  }
}

document.querySelector(".none-blur-bg").addEventListener("click", () => {
  applyForegroundReplacement = false;
  applyForegroundBlur = false;
});

document.querySelector(".blur").addEventListener("click", () => {
  applyForegroundReplacement = false;
  applyForegroundBlur = true;
});

document.querySelectorAll(".bg-img").forEach((el, index) => {
  el.addEventListener("click", () => {
    applyForegroundReplacement = true;
    applyForegroundBlur = false;
    foregroundImage.src = `/static/images/bgs/flip/bg-${index + 1}.jpeg`;
  });
});

function backgroundPanelDisplay() {
  const backgrounEffectsButton = document.querySelector(".background-effects");
  const backgrounEffectsPanel = document.querySelector(".background-panel");
  const closebacgroundEffectsButton = document.getElementById(
    "close-bacground-panel"
  );

  backgrounEffectsButton.addEventListener("click", () => {
    backgrounEffectsPanel.classList.add("show");
  });

  closebacgroundEffectsButton.addEventListener("click", () => {
    backgrounEffectsPanel.classList.remove("show");
  });
}
backgroundPanelDisplay();
export {
  initializeSegmenter,
  myStream,
  startBackgroundEffects,
  convertCanvasToStream,
};
