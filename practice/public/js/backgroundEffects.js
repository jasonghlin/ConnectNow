// Initialize MediaPipe Selfie Segmentation
const selfieSegmentation = new SelfieSegmentation({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
});

selfieSegmentation.setOptions({
  modelSelection: 1,
});

// Initialize camera
let videoElement = document.querySelector(".local-stream");
let camera = new Camera(videoElement, {
  onFrame: async () => {
    await selfieSegmentation.send({ image: videoElement });
  },
  width: 640,
  height: 480,
});
camera.start();

// Function to apply blur effect
const applyBlurEffect = () => {
  selfieSegmentation.onResults((results) => {
    const canvasElement = document.createElement("canvas");
    const canvasCtx = canvasElement.getContext("2d");
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    drawSegmentationMask(canvasCtx, results.segmentationMask, {
      color: [0, 0, 0, 0.5],
      blurRadius: 10,
    });
    canvasCtx.drawImage(
      videoElement,
      0,
      0,
      canvasElement.width,
      canvasElement.height
    );
    videoElement.srcObject = canvasElement.captureStream();
  });
};

// Function to change background
const applyBackgroundImage = (bgImage) => {
  const image = new Image();
  image.src = bgImage;
  image.onload = () => {
    selfieSegmentation.onResults((results) => {
      const canvasElement = document.createElement("canvas");
      const canvasCtx = canvasElement.getContext("2d");
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;

      drawSegmentationMask(canvasCtx, results.segmentationMask, {
        color: [0, 0, 0, 0],
      });
      canvasCtx.drawImage(
        image,
        0,
        0,
        canvasElement.width,
        canvasElement.height
      );
      canvasCtx.drawImage(
        videoElement,
        0,
        0,
        canvasElement.width,
        canvasElement.height
      );
      videoElement.srcObject = canvasElement.captureStream();
    });
  };
};

// Function to reset background
const resetBackgroundEffect = () => {
  selfieSegmentation.onResults((results) => {
    videoElement.srcObject = camera.video.srcObject;
  });
};

// Event listeners for buttons
document.querySelector(".blur").addEventListener("click", applyBlurEffect);
document.querySelectorAll(".bg-img").forEach((element) => {
  element.addEventListener("click", () => {
    const bgImage = element.querySelector("img").src;
    applyBackgroundImage(bgImage);
  });
});
document
  .querySelector(".none-blur-bg")
  .addEventListener("click", resetBackgroundEffect);

export { applyBlurEffect, applyBackgroundImage, resetBackgroundEffect };
