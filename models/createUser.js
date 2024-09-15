import { pool } from "./mysql.js";

async function createUser(name, email, hash_password) {
  let connection;
  try {
    const query =
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)";
    const values = [name, email, hash_password];

    // 使用 async/await 獲取連接
    connection = await pool.getConnection();

    // 使用 async/await 執行查詢
    const [results] = await connection.query(query, values);

    console.log("User inserted with ID:", results.insertId);

    return results.insertId; // 回傳插入結果
  } catch (err) {
    console.error("Error in createUser function:", err);
  } finally {
    if (connection) {
      connection.release(); // 確保釋放連接
    }
  }
}

export { createUser };
