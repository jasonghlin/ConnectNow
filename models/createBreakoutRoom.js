import { pool } from "./mysql.js";

async function createBreakoutRoom(roomId) {
  const query = "INSERT INTO breakout_room (name) VALUES (?)";
  const values = [roomId];

  try {
    const connection = await pool.getConnection();
    try {
      const [results] = await connection.query(query, values);
      return results.insertId;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error creating breakout room:", error);
  }
}

export { createBreakoutRoom };
