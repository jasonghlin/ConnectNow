// videoRecord.js

let mediaRecorder;
let recordedChunks = [];

document.querySelector(".video-record").addEventListener("click", () => {
  if (
    (!mediaRecorder || mediaRecorder.state === "inactive") &&
    confirm("是否要開始錄影")
  ) {
    startRecording();
  } else if (mediaRecorder.state === "recording") {
    stopRecording();
  }
});

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: "always",
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.onstop = handleStop;
    mediaRecorder.start();

    console.log("Recording started");
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
  const blob = new Blob(recordedChunks, {
    type: "video/webm",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  document.body.appendChild(a);
  a.style = "display: none";
  a.href = url;
  a.download = "meeting-recording.webm";
  a.click();
  window.URL.revokeObjectURL(url);
  recordedChunks = [];
}
