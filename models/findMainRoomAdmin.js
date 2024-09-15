import { pool } from "./mysql.js";

async function findMainRoomIdByName(roomName) {
  const query = "SELECT id FROM main_room WHERE name = ?";
  const values = [roomName];

  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.query(query, values);
    return results.length > 0 ? results[0].id : null;
  } catch (err) {
    console.error("Error in findMainRoomIdByName function: ", err);
  } finally {
    if (connection) connection.release();
  }
}

async function findMainRoomAdmin(mainRoomName) {
  const mainRoomId = await findMainRoomIdByName(mainRoomName);
  if (!mainRoomId) return null; // 如果沒找到 main room id，直接返回 null

  const query =
    "SELECT * FROM users_rooms_relation WHERE main_room_id = ? AND admin_user_id IS NOT NULL";
  const values = [mainRoomId];

  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.query(query, values);
    return results;
  } catch (err) {
    console.error("Error in findMainRoomAdmin function: ", err);
  } finally {
    if (connection) connection.release();
  }
}

export { findMainRoomAdmin };
