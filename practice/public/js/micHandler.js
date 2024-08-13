// micHandler.js

let micEnabled = true;

export const toggleMic = async (localStream) => {
  micEnabled = !micEnabled;

  if (localStream && localStream.getAudioTracks().length > 0) {
    localStream.getAudioTracks()[0].enabled = micEnabled;
    console.log(`Microphone ${micEnabled ? "enabled" : "disabled"}.`);
  } else {
    console.log("No audio track found.");
  }

  const micIcon = document.querySelector(".mic-icon i");
  if (micEnabled) {
    micIcon.classList.remove("fa-microphone-slash");
    micIcon.classList.add("fa-microphone");
  } else {
    micIcon.classList.remove("fa-microphone");
    micIcon.classList.add("fa-microphone-slash");
  }

  return micEnabled;
};
