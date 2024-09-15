import { pool } from "./mysql.js";

export async function checkUserInMainRoom(roomName, adminId) {
  let connection;
  try {
    connection = await pool.getConnection();

    // 先從 main_room table 查詢房間 id
    const getMainRoomIdQuery = "SELECT id FROM main_room WHERE name = (?)";
    const [mainRoomResults] = await connection.query(getMainRoomIdQuery, [
      roomName,
    ]);

    if (mainRoomResults.length === 0) {
      return false; // 如果找不到房間，直接返回 false
    }

    const mainRoomId = mainRoomResults[0].id;

    // 使用 mainRoomId 到 users_rooms_relation table 查詢
    const checkUserQuery =
      "SELECT * FROM users_rooms_relation WHERE main_room_id = (?) AND user_id = (?)";
    const [checkUserResults] = await connection.query(checkUserQuery, [
      mainRoomId,
      adminId,
    ]);

    return checkUserResults; // 回傳結果
  } catch (err) {
    console.error("Error in checkUserInMainRoom:", err);
  } finally {
    if (connection) connection.release();
  }
}
