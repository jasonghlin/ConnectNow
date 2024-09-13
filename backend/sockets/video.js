import { updateRoomConvertedVideoUrl } from "../../models/updateRoomConvertedVideoUrl.js";
import { updateRoomSrtUrl } from "../../models/updateRoomSrtUrl.js";
export default function socketVideo(io, socket) {
  socket.on("video_ready", async (urlObj) => {
    try {
      const roomId = urlObj.url.split("_")[1];
      console.log("video ready url: ", urlObj.url, "roomId", roomId);
      const updateRoomSrtResponse = await updateRoomConvertedVideoUrl(
        roomId,
        urlObj.url
      );
    } catch (error) {
      console.error(error);
    }
  });

  // srt 完成
  socket.on("srt_ready", async (urlObj) => {
    try {
      const roomId = urlObj.url.split("_")[1];
      console.log("srt ready url: ", urlObj.url, "roomId", roomId);
      const updateRoomSrtResponse = await updateRoomSrtUrl(roomId, urlObj.url);
    } catch (error) {
      console.error(error);
    }
  });
}
