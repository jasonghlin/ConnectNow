import { pool } from "./mysql.js";

async function getDbUserImg(user_id) {
  let connection;
  try {
    connection = await pool.getConnection();

    const imgQuery = "SELECT * FROM users WHERE id = ?";
    const values = [user_id];

    const [rows] = await connection.query(imgQuery, values);

    return rows[0]; // 回傳查詢結果中的第一筆資料
  } catch (err) {
    console.error("Error when retrieving user image:", err);
    return {};
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export { getDbUserImg };
