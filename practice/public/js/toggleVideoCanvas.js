import { myStream, updateStreamForPeers } from "./backgroundEffects.js";

let isVideoOn = true;

export const toggleVideoStream = async () => {
  const localCanvas = document.querySelector(".local-stream");

  if (isVideoOn) {
    // 停止本地影像
    const tracks = myStream.getTracks();
    tracks.forEach((track) => track.stop());
    isVideoOn = false;

    // 清空 canvas 內容
    const canvasCtx = localCanvas.getContext("2d");
    canvasCtx.clearRect(0, 0, localCanvas.width, localCanvas.height);

    // 通知其他用戶影像已停止
    updateStreamForPeers(new MediaStream());
  } else {
    // 重新啟動本地影像
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    // 將新流設置為 canvas 並啟動影像處理
    const video = document.createElement("video");
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      video.play();
      const canvasCtx = localCanvas.getContext("2d");
      localCanvas.width = video.videoWidth;
      localCanvas.height = video.videoHeight;

      function draw() {
        if (isVideoOn) {
          canvasCtx.drawImage(
            video,
            0,
            0,
            localCanvas.width,
            localCanvas.height
          );
          requestAnimationFrame(draw);
        }
      }

      draw();
    };

    // 通知其他用戶影像已重新啟動
    const newStream = localCanvas.captureStream();
    updateStreamForPeers(newStream);
    isVideoOn = true;
  }
};

document.querySelector(".video").addEventListener("click", toggleVideoStream);
