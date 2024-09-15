import { pool } from "./mysql.js";

async function createRoomVideoSrtUrl(roomName, adminUserId) {
  let connection;

  try {
    // 取得資料庫連線
    connection = await pool.getConnection();

    // 查詢 main_room 取得 room id
    const [mainRoomRows] = await connection.query(
      "SELECT id FROM main_room WHERE name = ?",
      [roomName]
    );

    if (mainRoomRows.length === 0) {
      console.error("Room not found");
    }

    const mainRoomId = mainRoomRows[0].id;

    // 插入新的記錄到 room_video_srt
    const [insertResult] = await connection.query(
      "INSERT INTO room_video_srt (admin_user_id, main_room_id) VALUES (?, ?)",
      [adminUserId, mainRoomId]
    );

    console.log(
      "Record inserted into room_video_srt table with ID:",
      insertResult.insertId
    );
    return insertResult.insertId;
  } catch (err) {
    console.error("Error in createRoomVideoSrtUrl function:", err);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export { createRoomVideoSrtUrl };
