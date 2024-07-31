let participantCount = 1;

function updateVideoLayout() {
  const videoStream = document.querySelector(".video-stream");
  const videos = Array.from(videoStream.querySelectorAll("video"));

  if (videos.length > 4) {
    videoStream.classList.add("many-participants");

    // Create or get the small videos container
    let smallVideosContainer = videoStream.querySelector(
      ".small-videos-container"
    );
    if (!smallVideosContainer) {
      smallVideosContainer = document.createElement("div");
      smallVideosContainer.className = "small-videos-container";
      videoStream.insertBefore(smallVideosContainer, videoStream.firstChild);
    }

    // Arrange videos
    videos.forEach((video, index) => {
      if (index === 0) {
        // First video (large, at bottom)
        video.classList.add("main-video");
        video.classList.remove("small-video");
        videoStream.appendChild(video);
      } else {
        // Other videos (small, at top)
        video.classList.remove("main-video");
        video.classList.add("small-video");
        smallVideosContainer.appendChild(video);
      }
    });

    // Adjust small videos container height based on number of videos
    const smallVideosCount = videos.length - 1;
    const rows = Math.ceil(smallVideosCount / 3); // Assume 3 videos per row
    smallVideosContainer.style.maxHeight = `${rows * 160}px`; // 150px height + 10px margin
  } else {
    videoStream.classList.remove("many-participants");

    // Remove the small videos container if it exists
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
  updateVideoLayout();
}

function handleUserDisconnected(userId) {
  participantCount--;

  // Remove the disconnected user's video element
  const videoElement = document.querySelector(
    `video[data-user-id="${userId}"]`
  );
  if (videoElement && videoElement.parentNode) {
    videoElement.parentNode.removeChild(videoElement);
  }

  updateVideoLayout();
}

// Initial layout update
updateVideoLayout();

// Export the functions for use in other files
export { updateVideoLayout, handleUserConnected, handleUserDisconnected };
