let participantCount = 1;

function updateVideoLayout() {
  console.log("Updating video layout");
  const videoStream = document.querySelector(".video-stream");
  const videos = Array.from(videoStream.querySelectorAll("video"));
  console.log(`Number of videos: ${videos.length}`);

  if (videos.length > 4) {
    videoStream.classList.add("many-participants");

    let smallVideosContainer = videoStream.querySelector(
      ".small-videos-container"
    );
    if (!smallVideosContainer) {
      smallVideosContainer = document.createElement("div");
      smallVideosContainer.className = "small-videos-container";
      videoStream.insertBefore(smallVideosContainer, videoStream.firstChild);
    }

    videos.forEach((video, index) => {
      if (index === 0) {
        video.classList.add("main-video");
        video.classList.remove("small-video");
        videoStream.appendChild(video);
      } else {
        video.classList.remove("main-video");
        video.classList.add("small-video");
        smallVideosContainer.appendChild(video);
      }
    });

    const smallVideosCount = videos.length - 1;
    const rows = Math.ceil(smallVideosCount / 3);
    smallVideosContainer.style.maxHeight = `${rows * 160}px`;
  } else {
    videoStream.classList.remove("many-participants");

    const smallVideosContainer = videoStream.querySelector(
      ".small-videos-container"
    );
    if (smallVideosContainer) {
      while (smallVideosContainer.firstChild) {
        videoStream.appendChild(smallVideosContainer.firstChild);
      }
      smallVideosContainer.remove();
    }

    videos.forEach((video) => {
      video.classList.remove("main-video", "small-video");
    });
  }
}

function handleUserConnected() {
  participantCount++;
  console.log(`User connected. Participant count: ${participantCount}`);
  updateVideoLayout();
}

function handleUserDisconnected(userId) {
  participantCount--;
  console.log(
    `User ${userId} disconnected. Participant count: ${participantCount}`
  );

  const videoElement = document.querySelector(
    `video[data-user-id="${userId}"]`
  );
  if (videoElement) {
    if (videoElement.srcObject) {
      const tracks = videoElement.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    }
    videoElement.remove();
    console.log(`Video element removed for user: ${userId}`);
  }

  updateVideoLayout();
}

updateVideoLayout();

export { updateVideoLayout, handleUserConnected, handleUserDisconnected };
