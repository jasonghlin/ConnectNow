import {
  ImageSegmenter,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2";

let imageSegmenter;
let labels;
let webcamRunning = false;
let runningMode = "VIDEO";

const canvasElement = document.createElement("canvas");
const canvasCtx = canvasElement.getContext("2d");
let applyForegroundReplacement = false;
let applyForegroundBlur = false;

let foregroundImage = new Image();
foregroundImage.crossOrigin = "Anonymous";
foregroundImage.src =
  "https://static.connectnow.website/connectnow/static/images/bgs/bg-1.jpeg";

let localVideo = document.createElement("video");
localVideo.classList.add("local-stream");
localVideo.classList.add("invert-screen");
localVideo.muted = true;

const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true,
});

localVideo.srcObject = stream;

localVideo.addEventListener("loadedmetadata", async () => {
  canvasElement.width = localVideo.videoWidth;
  canvasElement.height = localVideo.videoHeight;

  try {
    let myStream = await convertCanvasToStream(canvasElement);

    // 初始化 segmenter
    initializeSegmenter().catch((error) => {
      console.error("Failed to initialize segmenter:", error);
    });
  } catch (error) {
    console.error("Error in convertCanvasToStream:", error);
  }
});

localVideo.play();

const initializeSegmenter = async () => {
  await createImageSegmenter();
  startBackgroundEffects();
};

const createImageSegmenter = async () => {
  const visionFileset = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm"
  );

  imageSegmenter = await ImageSegmenter.createFromOptions(visionFileset, {
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

async function predictWebcam() {
  if (!webcamRunning) {
    return;
  }

  // 绘制当前帧
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

    // 调用 segmentForVideo，并在回调中处理结果
    imageSegmenter.segmentForVideo(localVideo, startTimeMs, (result) => {
      callbackForVideo(result);

      // 使用 requestAnimationFrame 来异步调用 predictWebcam
      requestAnimationFrame(() => {
        predictWebcam();
      });
    });
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
        // 替换前景
        pixels[pixelIndex] = fgImageData[pixelIndex];
        pixels[pixelIndex + 1] = fgImageData[pixelIndex + 1];
        pixels[pixelIndex + 2] = fgImageData[pixelIndex + 2];
        pixels[pixelIndex + 3] = fgImageData[pixelIndex + 3];
      }
    }

    // 平滑边缘
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
    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error("Canvas width or height is zero.");
    }

    const videoOutput = await canvas.captureStream();
    if (!videoOutput.getTracks) {
      throw new Error(
        "Canvas captureStream did not return a valid MediaStream"
      );
    }

    // 创建一个翻转的 canvas，用于发送 stream
    const flippedCanvas = document.createElement("canvas");
    flippedCanvas.width = canvas.width;
    flippedCanvas.height = canvas.height;
    const flippedCtx = flippedCanvas.getContext("2d");

    // 每次绘制时将内容水平翻转
    function flipCanvas() {
      flippedCtx.save();
      flippedCtx.scale(-1, 1); // 水平翻转
      flippedCtx.drawImage(
        canvas,
        -canvas.width,
        0,
        canvas.width,
        canvas.height
      );
      flippedCtx.restore();
      requestAnimationFrame(flipCanvas); // 持续翻转画布
    }
    flipCanvas();

    const flippedStream = flippedCanvas.captureStream(); // capture 翻转后的 stream

    const mic = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    // 根据 isMicMuted 参数来静音或取消静音音频
    mic.getAudioTracks()[0].enabled = !isMicMuted;

    const combine = new MediaStream([
      ...flippedStream.getTracks(),
      ...mic.getTracks(),
    ]);
    return combine;
  } catch (error) {
    console.log(error);
    throw error;
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
    foregroundImage.crossOrigin = "Anonymous";
    foregroundImage.src = `https://static.connectnow.website/connectnow/static/images/bgs/flip/bg-${
      index + 1
    }.jpeg?stopGivingMeHeadaches=true`;
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

window.addEventListener("unhandledrejection", function (event) {
  console.error("Unhandled promise rejection:", event.reason);
});

export { initializeSegmenter, startBackgroundEffects, convertCanvasToStream };
