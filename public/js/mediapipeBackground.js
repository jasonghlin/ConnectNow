let localStream = null; // 本地视频流
let currentStream = null; // 当前的视频或屏幕流
let videoElement = document.createElement("video"); // 用于处理背景的视频元素
let backgroundStream = null; // 用于保存处理后的背景视频流
let backgroundCanvas = document.createElement("canvas");
let backgroundCanvasCtx = backgroundCanvas.getContext("2d");

// 背景模式：'none', 'blur', 'image'
let backgroundMode = "none";
let backgroundImage = null;

// 初始化 SelfieSegmentation 模型
const selfieSegmentation = new SelfieSegmentation({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
});

selfieSegmentation.setOptions({
  modelSelection: 1,
});

selfieSegmentation.onResults(onResults);

function onResults(results) {
  if (!results.segmentationMask) return;

  backgroundCanvas.width = videoElement.videoWidth;
  backgroundCanvas.height = videoElement.videoHeight;

  // 清除畫布
  backgroundCanvasCtx.clearRect(
    0,
    0,
    backgroundCanvas.width,
    backgroundCanvas.height
  );

  // 繪製背景
  if (backgroundMode === "blur") {
    backgroundCanvasCtx.filter = "blur(10px)";
    backgroundCanvasCtx.drawImage(
      videoElement,
      0,
      0,
      backgroundCanvas.width,
      backgroundCanvas.height
    );
  } else if (backgroundMode === "image" && backgroundImage) {
    backgroundCanvasCtx.drawImage(
      backgroundImage,
      0,
      0,
      backgroundCanvas.width,
      backgroundCanvas.height
    );
  } else {
    backgroundCanvasCtx.drawImage(
      videoElement,
      0,
      0,
      backgroundCanvas.width,
      backgroundCanvas.height
    );
  }

  // 繪製前景
  backgroundCanvasCtx.globalCompositeOperation = "destination-atop";
  backgroundCanvasCtx.drawImage(
    results.segmentationMask,
    0,
    0,
    backgroundCanvas.width,
    backgroundCanvas.height
  );

  // 恢復正常的繪畫操作
  backgroundCanvasCtx.globalCompositeOperation = "destination-over";
  backgroundCanvasCtx.drawImage(
    videoElement,
    0,
    0,
    backgroundCanvas.width,
    backgroundCanvas.height
  );
}

async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });

  videoElement.srcObject = stream;

  // 確保 stream 加載完畢後再播放
  await new Promise((resolve) => {
    videoElement.onloadedmetadata = () => {
      resolve();
    };
  });

  try {
    await videoElement.play();
  } catch (error) {
    console.error("Error playing video:", error);
  }

  localStream = stream;
  currentStream = stream;

  // 初始化 Camera
  const camera = new Camera(videoElement, {
    onFrame: async () => {
      await selfieSegmentation.send({ image: videoElement });
    },
    // width: 640,
    // height: 480,
  });

  camera.start();
}

// 背景处理函数
function setBackground(mode, imageSrc) {
  backgroundMode = mode;
  if (mode === "image" && imageSrc) {
    backgroundImage = new Image();
    backgroundImage.src = imageSrc;
    backgroundImage.onload = () => {
      // 更新背景图像
      selfieSegmentation.send({ image: videoElement });
    };
  } else {
    backgroundImage = null;
  }
}

// 启动摄像头和背景处理
startCamera();

export { setBackground, startCamera };
