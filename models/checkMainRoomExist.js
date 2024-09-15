import { pool } from "./mysql.js";

async function checkMainRoomExist(roomName) {
  const checkMainRoomExistQuery = "SELECT * FROM main_room WHERE name = (?)";
  const mainRoomValues = [roomName];
  let connection;

  try {
    connection = await pool.getConnection();

    const [results] = await connection.query(
      checkMainRoomExistQuery,
      mainRoomValues
    );

    return results.length > 0 ? results : false;
  } catch (err) {
    console.error("Error in checkMainRoomExist:", err);
  } finally {
    if (connection) connection.release();
  }
}

export { checkMainRoomExist };
