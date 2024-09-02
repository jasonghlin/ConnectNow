import { pool, createDatabase, useDatabase, createUserTable } from "./mysql.js";

async function createUser(name, email, hash_password) {
  try {
    await createDatabase();
    await useDatabase();
    await createUserTable();
    const query =
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)";
    const values = [name, email, hash_password];

    const connection = await new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
        } else {
          resolve(connection);
        }
      });
    });

    await new Promise((resolve, reject) => {
      connection.query(query, values, (error, results, fields) => {
        connection.release();
        if (error) {
          reject(error);
        } else {
          console.log("User inserted with ID:", results.insertId);
          resolve(results.insertId);
        }
      });
    });
  } catch (err) {
    console.error("Error in createUser function:", err);
  }
}

export { createUser };
