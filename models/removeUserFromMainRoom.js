import { pool } from "./mysql.js";

async function removeUserFromMainRoom(mainRoomName, userId) {
  let connection;
  try {
    connection = await pool.getConnection();
    const getMainRoomIdQuery = "SELECT id FROM main_room WHERE name = ?";
    const [mainRoomResults] = await connection.query(getMainRoomIdQuery, [
      mainRoomName,
    ]);

    if (mainRoomResults.length === 0) {
      console.error("Main room not found");
    }

    const mainRoomId = mainRoomResults[0].id;

    const deleteQuery =
      "DELETE FROM users_rooms_relation WHERE user_id = ? AND main_room_id = ?";
    const [deleteResults] = await connection.query(deleteQuery, [
      userId,
      mainRoomId,
    ]);

    console.log("User deleted from users_rooms_relation with ID:", userId);
    return deleteResults;
  } catch (err) {
    console.error("Error in removeUserFromMainRoom function:", err);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export { removeUserFromMainRoom };
