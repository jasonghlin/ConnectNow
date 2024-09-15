import { pool } from "./mysql.js";

async function updateRoomSrtUrl(roomName, srtUrl) {
  let connection;
  try {
    connection = await pool.getConnection();

    // 查詢 main_room 的 id
    const [mainRoomResults] = await connection.query(
      "SELECT id FROM main_room WHERE name = ?",
      [roomName]
    );

    if (mainRoomResults.length === 0) {
      console.error("main_room not found");
    }

    const mainRoomId = mainRoomResults[0].id;

    const [updateResults] = await connection.query(
      "UPDATE room_video_srt SET srt_url = ? WHERE main_room_id = ? AND srt_url = 'Pending'",
      [srtUrl, mainRoomId]
    );

    if (updateResults.affectedRows === 0) {
      console.error(
        "No matching records found to update room_video_srt srt_url"
      );
    }

    console.log(
      "srt_url updated for room_video_srt with main_room_id:",
      mainRoomId
    );
  } catch (err) {
    console.error("Error in updateRoomSrtUrl function:", err);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export { updateRoomSrtUrl };
