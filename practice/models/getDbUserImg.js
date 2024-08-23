import { pool, createDatabase, useDatabase, createUserTable } from "./mysql.js";

async function getDbUserImg(user_id) {
  try {
    const connection = await new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
        } else {
          resolve(connection);
        }
      });
    });

    const imgQuery = "SELECT * FROM users WHERE id = ?";
    const values = [user_id];

    const result = await new Promise((resolve, reject) => {
      connection.query(imgQuery, values, (error, results) => {
        connection.release();
        if (error) {
          reject(error);
        } else {
          resolve(results[0]);
        }
      });
    });
    return result;
  } catch (err) {
    console.error("Error when retrieving user image:", err);
    return {};
  }
}

export { getDbUserImg };
