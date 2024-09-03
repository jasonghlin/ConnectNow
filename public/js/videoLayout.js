function updateVideoLayout() {
  const videoElements = document.querySelectorAll(
    ".video-stream > .video-wrapper"
  );
  const participantsCount = videoElements.length;
  const videoStreamContainer = document.querySelector(".video-stream");
  const mainVideo = document.querySelector(".main-video");
  videoStreamContainer.classList.remove("small-layout");
  videoStreamContainer.classList.remove("many-participants");
  videoStreamContainer.classList.remove("too-many-participants");
  console.log("participantsCount: ", participantsCount);
  console.log("update video layout");
  if (mainVideo) {
    console.log("main video exist");

    let smallVideosContainer = videoStreamContainer.querySelector(
      ".small-videos-container"
    );

    if (!smallVideosContainer) {
      smallVideosContainer = document.createElement("div");
      smallVideosContainer.className = "small-videos-container";
      videoStreamContainer.insertBefore(
        smallVideosContainer,
        videoStreamContainer.firstChild
      );
    }

    let mainVideoContainer = videoStreamContainer.querySelector(
      ".main-video-container"
    );
    if (!mainVideoContainer) {
      mainVideoContainer = document.createElement("div");
      mainVideoContainer.className = "main-video-container";
      videoStreamContainer.appendChild(mainVideoContainer);
    }
    // 將 main-video-container 插入在 small-videos-container 下面
    smallVideosContainer.insertAdjacentElement("afterend", mainVideoContainer);

    videoStreamContainer.classList.add("too-many-participants");
    const videos = Array.from(
      videoStreamContainer.querySelectorAll(".video-wrapper")
    );
    const localStream = document.querySelector(".local-stream");

    const mainVideoAttributeValue = mainVideo.getAttribute("data-peer-id");
    videos.unshift(localStream);
    videos.forEach((video, index) => {
      const attributeValue = video.getAttribute("data-peer-id");

      if (mainVideoAttributeValue !== attributeValue) {
        video.classList.add("small-video");
        video.style.maxWidth = `200px`;
        video.style.height = "100%";
        smallVideosContainer.appendChild(video);
      } else {
        mainVideoContainer.appendChild(mainVideo);
      }
    });
  } else if (participantsCount <= 3) {
    console.log("update video layout with small-layout");
    videoStreamContainer.classList.add("small-layout");
    const localStream = document.querySelector(".local-stream");
    const videos = Array.from(
      videoStreamContainer.querySelectorAll(".video-wrapper")
    );
    videos.unshift(localStream);
    videos.forEach((video) => {
      videoStreamContainer.appendChild(video);
    });

    const smallVideosContainer = document.querySelector(
      ".small-videos-container"
    );
    const mainVideoContainer = document.querySelector(".main-video-container");

    // 移除這兩個容器
    if (smallVideosContainer) {
      smallVideosContainer.remove(); // 移除 small-videos-container
    }

    if (mainVideoContainer) {
      mainVideoContainer.remove(); // 移除 main-video-container
    }
  } else if (participantsCount <= 5) {
    videoStreamContainer.classList.remove("small-layout");
    videoStreamContainer.classList.add("many-participants");
  } else {
    const videoStream = document.querySelector(".video-stream");
    let smallVideosContainer = videoStream.querySelector(
      ".small-videos-container"
    );

    if (!smallVideosContainer) {
      smallVideosContainer = document.createElement("div");
      smallVideosContainer.className = "small-videos-container";
      videoStream.insertBefore(smallVideosContainer, videoStream.firstChild);
    }

    let mainVideoContainer = videoStream.querySelector(".main-video-container");
    if (!mainVideoContainer) {
      mainVideoContainer = document.createElement("div");
      mainVideoContainer.className = "main-video-container";
      videoStream.appendChild(mainVideoContainer);
    }
    // 將 main-video-container 插入在 small-videos-container 下面
    smallVideosContainer.insertAdjacentElement("afterend", mainVideoContainer);

    videoStream.classList.add("too-many-participants");
    const videos = Array.from(videoStream.querySelectorAll("video"));
    const localStream = document.querySelector(".local-stream");
    localStream.classList.add("main-video");
    videos.forEach((video, index) => {
      video.classList.add("small-video");
      video.style.maxWidth = `200px`;
      video.style.height = "100%";
      smallVideosContainer.appendChild(video);
    });
  }
}

export { updateVideoLayout };
