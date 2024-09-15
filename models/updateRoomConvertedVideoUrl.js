import { pool } from "./mysql.js";

async function updateRoomConvertedVideoUrl(roomName, videoUrl) {
  let connection;
  try {
    connection = await pool.getConnection();

    // 查詢 main_room 的 id
    const [roomResults] = await connection.query(
      "SELECT id FROM main_room WHERE name = ?",
      [roomName]
    );

    if (roomResults.length === 0) {
      console.error("main_room not found");
    }

    const mainRoomId = roomResults[0].id;

    const [updateResults] = await connection.query(
      "UPDATE room_video_srt SET video_url = ? WHERE main_room_id = ? AND video_url = 'Pending'",
      [videoUrl, mainRoomId]
    );

    if (updateResults.affectedRows === 0) {
      console.error(
        "No matching records found to update room_video_srt video_url"
      );
    }

    console.log(
      "video_url updated for room_video_srt with main_room_id:",
      mainRoomId
    );
  } catch (err) {
    console.error("Error in updateRoomConvertedVideoUrl function:", err);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export { updateRoomConvertedVideoUrl };
