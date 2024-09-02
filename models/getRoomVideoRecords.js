import { pool } from "./mysql.js";

async function getRoomVideoRecords(user_id) {
  try {
    const connection = await new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
        } else {
          resolve(connection);
        }
      });
    });

    const imgQuery =
      "SELECT main_room.name AS main_room_name, video_url, srt_url FROM room_video_srt INNER JOIN main_room ON room_video_srt.main_room_id = main_room.id WHERE admin_user_id = ?";
    const values = [user_id];

    const result = await new Promise((resolve, reject) => {
      connection.query(imgQuery, values, (error, results) => {
        connection.release();
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });
    return result;
  } catch (err) {
    console.error("Error when retrieving roomVideoRecord:", err);
    return {};
  }
}

export { getRoomVideoRecords };
