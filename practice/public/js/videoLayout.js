function updateVideoLayout() {
  const videoElements = document.querySelectorAll(".video-stream video");
  const participantsCount = videoElements.length;
  const videoStreamContainer = document.querySelector(".video-stream");
  console.log("participantsCount: ", participantsCount);
  console.log("update video layout");
  if (participantsCount >= 2) {
    console.log("update video layout with small-layout");
    videoStreamContainer.classList.add("small-layout");
  } else {
    videoStreamContainer.classList.remove("many-participants");
  }
}

export { updateVideoLayout };
