import { pool, useDatabase } from "./mysql.js";

async function get_user(request_body) {
  try {
    await useDatabase();
    const query = "SELECT * FROM users WHERE email = ?";
    const values = [request_body.email];

    return new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
          return;
        }
        connection.query(query, values, (error, results, fields) => {
          connection.release();
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        });
      });
    });
  } catch (err) {
    console.error("Error in get_user function:", err);
    throw err;
  }
}

export { get_user };
