function updateVideoLayout() {
  const videoElements = document.querySelectorAll(".video-stream video");
  const participantsCount = videoElements.length;
  const videoStreamContainer = document.querySelector(".video-stream");
  console.log("update video layout");
  if (participantsCount >= 2) {
    videoStreamContainer.classList.add("small-layout");
  } else if (participantsCount > 3) {
    videoStreamContainer.classList.add("many-participants");
  } else {
    videoStreamContainer.classList.remove("many-participants");
  }
}

export { updateVideoLayout };
