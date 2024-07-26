let isMicListActive = false; // 变量来跟踪 listMic 是否处于活动状态
let isVideoListActive = false;
let currentAudioStream = null; // 存储当前的音频流
let currentVideoStream = null; // 存储当前的音频流

async function handleMicList(peers, localStream, switchStream) {
  try {
    const chooseMic = document.querySelector(".choose-mic");
    const chooseVideo = document.querySelector(".choose-video");
    const micList = document.querySelector(".mic-list");
    const videoList = document.querySelector(".video-list");
    const devices = await navigator.mediaDevices.enumerateDevices();

    function listMicVideo() {
      micList.innerHTML = ""; // 清空之前的列表
      videoList.innerHTML = ""; // 清空之前的列表

      devices.forEach((device) => {
        const option = document.createElement("option");
        option.value = device.deviceId;
        option.text = device.label;
        if (device.kind === "audioinput") {
          micList.appendChild(option);
        } else if (device.kind === "videoinput") {
          videoList.appendChild(option);
        }
      });
    }

    function toggleMicList() {
      if (isMicListActive) {
        micList.innerHTML = ""; // 隐藏列表
        micList.classList.add("hidden");
      } else {
        micList.classList.remove("hidden");
        listMicVideo(); // 显示列表
      }
      isMicListActive = !isMicListActive; // 切换状态
    }

    function toggleVideoList() {
      if (isVideoListActive) {
        videoList.innerHTML = ""; // 隐藏列表
        videoList.classList.add("hidden");
      } else {
        videoList.classList.remove("hidden");
        listMicVideo(); // 显示列表
      }
      isVideoListActive = !isVideoListActive; // 切换状态
    }

    // 添加 change 事件监听器
    micList.addEventListener("change", async (event) => {
      micList.classList.add("hidden");
      const constraints = {
        audio: { deviceId: { exact: event.target.value } },
        video: true,
      };
      try {
        // 停止之前的音频流
        if (currentAudioStream) {
          currentAudioStream.getTracks().forEach((track) => track.stop());
        }

        const newStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );
        const tracks = newStream.getAudioTracks();
        console.log(tracks);

        // 保存新的音频流
        currentAudioStream = newStream;

        // 更新音频轨道
        for (let userId in peers) {
          const sender = peers[userId].peerConnection
            .getSenders()
            .find((sender) => sender.track.kind === "audio");
          if (sender) {
            sender.replaceTrack(newStream.getAudioTracks()[0]);
          }
        }
      } catch (error) {
        console.log(error);
      }
    });

    videoList.addEventListener("change", async (event) => {
      videoList.classList.add("hidden");
      const constraints = {
        audio: true,
        video: { deviceId: { exact: event.target.value } },
      };
      try {
        // 停止之前的視訊流
        if (currentVideoStream) {
          currentVideoStream.getTracks().forEach((track) => track.stop());
        }

        const newStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );
        currentVideoStream = newStream;
        localStream = newStream; // 更新本地流

        switchStream(newStream);
      } catch (error) {
        console.log(error);
      }
    });

    chooseMic.addEventListener("click", toggleMicList);
    chooseVideo.addEventListener("click", toggleVideoList);
  } catch (error) {
    console.log(error);
  }
}

export { handleMicList };
