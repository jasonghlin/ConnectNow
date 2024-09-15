import { pool } from "./mysql.js";

async function updateUserEmail(new_email, user_id) {
  let connection;
  try {
    const query = "UPDATE users SET email = ? WHERE id = ?";
    const values = [new_email, user_id];

    connection = await pool.getConnection();

    const [result] = await connection.query(query, values);

    if (result.affectedRows > 0) {
      console.log("User email updated with ID:", user_id);
      return true;
    } else {
      console.log("No rows updated.");
      return false;
    }
  } catch (err) {
    console.error("Error in updateUserEmail:", err);
    return false;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export { updateUserEmail };
