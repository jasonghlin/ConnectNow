import { pool } from "./mysql.js";

async function updateUserPassword(new_password, user_id) {
  let connection;
  try {
    const query = "UPDATE users SET password_hash = ? WHERE id = ?";
    const values = [new_password, user_id];

    connection = await pool.getConnection();

    const [result] = await connection.query(query, values);

    if (result.affectedRows > 0) {
      console.log("User password updated with ID:", user_id);
      return true;
    } else {
      console.log("No rows updated.");
      return false;
    }
  } catch (err) {
    console.error("Error in update UserPassword:", err);
    return false;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export { updateUserPassword };
