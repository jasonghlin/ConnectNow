import { pool, createDatabase, useDatabase, createUserTable } from "./mysql.js";

async function updateUserEmail(new_email, user_id) {
  try {
    await createDatabase();
    await useDatabase();
    await createUserTable();

    const query = "UPDATE users SET email = ? WHERE id = ?";
    const values = [new_email, user_id];

    const connection = await new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
        } else {
          resolve(connection);
        }
      });
    });

    const result = await new Promise((resolve, reject) => {
      connection.query(query, values, (error, results, fields) => {
        connection.release();
        if (error) {
          reject(error);
        } else {
          console.log("UserEmail updated with ID:", user_id);
          resolve(results);
        }
      });
    });

    // 判斷是否有行受到影響
    if (result.affectedRows > 0) {
      console.log("User email updated with ID:", user_id);
      return true; // 成功更新
    } else {
      console.log("No rows updated.");
      return false; // 沒有行被更新
    }
  } catch (err) {
    console.error("Error in update UserEmail:", err);
  }
}

export { updateUserEmail };
