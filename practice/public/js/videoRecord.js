// videoRecording.js

let mediaRecorder;
let recordedChunks = [];
let movBlob;
let isRecording = true;

function handleVideoRecordClick() {
  if (isRecording) {
    document.querySelector(
      ".video-record"
    ).innerHTML = `<div class="icon-wrapper is-recording">
                        <i class="fas fa-record-vinyl"></i>
                    </div>
                    <div>
                        <p>停止錄製</p>
                        <p>再次按下來停止錄製</p>
                    </div>`;
  } else {
    document.querySelector(
      ".video-record"
    ).innerHTML = `<div class="icon-wrapper">
                        <i class="fas fa-record-vinyl"></i>
                    </div>
                    <div>
                        <p>錄製</p>
                        <p>錄下會議過程供日後隨選觀看</p>
                    </div>`;
  }
  if (
    (!mediaRecorder || mediaRecorder.state === "inactive") &&
    confirm("是否要開始錄影")
  ) {
    alert("錄影設定中...");
    isRecording = !isRecording;
    startRecording();
  } else if (mediaRecorder.state === "recording") {
    isRecording = !isRecording;
    stopRecording();
  }
}

// 使用 MutationObserver 監聽 DOM 變化
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      // 檢查是否是我們想要的按鈕
      if (node.classList && node.classList.contains("video-record")) {
        // 為新加的按鈕增加事件監聽器
        node.addEventListener("click", handleVideoRecordClick);
      }
    });
  });
});

// 啟動 observer 監聽 document body 上的變化
observer.observe(document.body, { childList: true, subtree: true });

async function startRecording() {
  try {
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: "always",
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    // 捕获麦克风音频流
    const audioStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    // 合并屏幕流和麦克风音频流
    const combinedStream = new MediaStream([
      ...displayStream.getVideoTracks(),
      ...audioStream.getAudioTracks(),
    ]);

    // 检查合并后的音频轨道
    const audioTracks = combinedStream.getAudioTracks();
    if (audioTracks.length > 0) {
      console.log("Audio track found for recording:", audioTracks[0]);
    } else {
      console.log("No audio track found for recording.");
    }

    mediaRecorder = new MediaRecorder(combinedStream);
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.onstop = handleStop;
    mediaRecorder.start();

    console.log("Recording started");
    alert("開始錄影");
  } catch (err) {
    console.error("Error: " + err);
  }
}

function stopRecording() {
  mediaRecorder.stop();
  console.log("Recording stopped");
}

function handleDataAvailable(event) {
  if (event.data.size > 0) {
    recordedChunks.push(event.data);
  }
}

function handleStop() {
  const webmBlob = new Blob(recordedChunks, { type: "video/webm" });
  convertToMov(webmBlob);
}

async function convertToMov(webmBlob) {
  const formData = new FormData();
  formData.append("recording", webmBlob, "video.webm");

  try {
    const response = await fetch("/video-record", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Failed to convert video.");

    const blob = await response.blob();
    movBlob = blob;

    // Allow user to download the MOV file
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    a.href = url;
    a.download = "video.mov";
    a.click();
    window.URL.revokeObjectURL(url);

    // Notify user that subtitles are being generated
    alert("影片已下載完成，字幕正在產生中...");

    // Send MOV file to FastAPI for subtitle processing
    await sendToFastAPI(blob);
  } catch (error) {
    console.error("Error during MOV conversion:", error);
  }
}

async function sendToFastAPI(movBlob) {
  const formData = new FormData();
  formData.append("file", movBlob, "video.mov");

  try {
    const response =
      window.location.protocol == "https:"
        ? await fetch("https://srt-generate.connectnow.website/videoSrt", {
            method: "POST",
            body: formData,
          })
        : await fetch("http://localhost:8000/videoSrt", {
            method: "POST",
            body: formData,
          });

    if (!response.ok) throw new Error("Failed to process subtitles.");

    // Download the SRT file
    const srtBlob = await response.blob();
    const url = URL.createObjectURL(srtBlob);
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    a.href = url;
    a.download = "subtitles.srt";
    a.click();
    window.URL.revokeObjectURL(url);

    alert("字幕已產生完成");
  } catch (error) {
    alert(`字幕產生錯誤 ${error}`);
    console.error("Error during subtitle processing:", error);
  }
}
