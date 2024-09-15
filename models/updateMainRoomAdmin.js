import { pool } from "./mysql.js";

async function updateMainRoomAdmin(newAdminId, roomName) {
  let connection;
  try {
    const mainRoomId = await findMainRoom(roomName);

    const query =
      "UPDATE users_rooms_relation SET admin_user_id = ? WHERE main_room_id = ?";
    const values = [newAdminId, mainRoomId[0].id];

    connection = await pool.getConnection();

    const [result] = await connection.query(query, values);

    return result.insertId;
  } catch (error) {
    console.error("Error in updateMainRoomAdmin:", error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function findMainRoom(roomName) {
  let connection;
  try {
    const query = "SELECT * FROM main_room WHERE name = ?";
    const values = [roomName];

    connection = await pool.getConnection();

    const [results] = await connection.query(query, values);
    return results;
  } catch (err) {
    console.error("Error in findMainRoom:", err);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export { updateMainRoomAdmin };
