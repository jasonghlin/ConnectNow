import { pool } from "./mysql.js";

async function getRoomVideoRecords(user_id) {
  let connection;
  try {
    connection = await pool.getConnection();

    const imgQuery =
      "SELECT main_room.name AS main_room_name, video_url, srt_url FROM room_video_srt INNER JOIN main_room ON room_video_srt.main_room_id = main_room.id WHERE admin_user_id = ?";
    const values = [user_id];

    const [results] = await connection.query(imgQuery, values);

    return results;
  } catch (err) {
    console.error("Error when retrieving roomVideoRecord:", err);
    return {};
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export { getRoomVideoRecords };
