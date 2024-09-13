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
      connection.release(); // 確保無論如何都會釋放連線
    }
  } catch (error) {
    console.error("Error creating breakout room:", error);
    throw error; // 傳遞錯誤給呼叫者
  }
}

export { createBreakoutRoom };
