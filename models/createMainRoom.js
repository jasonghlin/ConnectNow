import { pool } from "./mysql.js";

async function createMainRoom(userInfo, roomId) {
  const query = "INSERT INTO main_room (name) VALUES (?)";
  const values = [roomId];

  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.query(query, values);
    return results.insertId;
  } catch (error) {
    console.error("Error in createMainRoom function: ", createMainRoom);
  } finally {
    if (connection) connection.release();
  }
}

export { createMainRoom };
