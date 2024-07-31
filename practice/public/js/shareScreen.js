let shareMediaStream = null;

async function shareScreen() {
  const options = {
    video: true,
    audio: false, // 通常在分享螢幕時不需要分享音訊
  };
  try {
    shareMediaStream = await navigator.mediaDevices.getDisplayMedia(options);
    return shareMediaStream; // 返回媒體流
  } catch (error) {
    console.log(error);
  }
}

function resetShareMediaStream() {
  shareMediaStream = null;
}

export { shareScreen, shareMediaStream, resetShareMediaStream };
