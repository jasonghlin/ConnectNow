import { pool } from "./mysql.js";

async function updateUserName(new_name, user_id) {
  let connection;
  try {
    const query = "UPDATE users SET name = ? WHERE id = ?";
    const values = [new_name, user_id];

    connection = await pool.getConnection();

    const [result] = await connection.query(query, values);

    if (result.affectedRows > 0) {
      console.log("User updated with ID:", user_id);
      return true;
    } else {
      console.log("No rows updated.");
      return false;
    }
  } catch (err) {
    console.error("Error in update UserName:", err);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export { updateUserName };
