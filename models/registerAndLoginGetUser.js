import { pool } from "./mysql.js";

async function getUser(request_body) {
  let connection;
  try {
    const query = "SELECT * FROM users WHERE email = ?";
    const values = [request_body.email];

    connection = await pool.getConnection();

    const [results] = await connection.query(query, values);

    return results;
  } catch (err) {
    console.error("Error in getUser function:", err);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export { getUser };
