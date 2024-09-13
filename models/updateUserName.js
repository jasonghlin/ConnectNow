import { pool, createDatabase, useDatabase, createUserTable } from "./mysql.js";

async function updateUserName(new_name, user_id) {
  try {
    await createDatabase();
    await useDatabase();
    await createUserTable();

    const query = "UPDATE users SET name = ? WHERE id = ?";
    const values = [new_name, user_id];

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
          console.log("UserName updated with ID:", user_id);
          resolve(results);
        }
      });
    });

    // 判斷是否有行受到影響
    if (result.affectedRows > 0) {
      console.log("User updated with ID:", user_id);
      return true;
    } else {
      console.log("No rows updated.");
      return false;
    }
  } catch (err) {
    console.error("Error in update UserName:", err);
  }
}

export { updateUserName };
