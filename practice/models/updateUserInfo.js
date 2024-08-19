import {
  pool,
  createDatabase,
  useDatabase,
  createUserTable,
  createUserImgTable,
} from "./mysql.js";

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
      return true; // 成功更新
    } else {
      console.log("No rows updated.");
      return false; // 沒有行被更新
    }
  } catch (err) {
    console.error("Error in update UserName:", err);
  }
}

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

async function updateUserPassword(new_password, user_id) {
  try {
    await createDatabase();
    await useDatabase();
    await createUserTable();

    const query = "UPDATE users SET password_hash = ? WHERE id = ?";
    const values = [new_password, user_id];

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
          console.log("UserPassword updated with ID:", user_id);
          resolve(results);
        }
      });
    });

    // 判斷是否有行受到影響
    if (result.affectedRows > 0) {
      console.log("User password updated with ID:", user_id);
      return true; // 成功更新
    } else {
      console.log("No rows updated.");
      return false; // 沒有行被更新
    }
  } catch (err) {
    console.error("Error in update UserEmail:", err);
  }
}

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

async function updateDbUserImg(user_id, img_url) {
  try {
    await createDatabase();
    await useDatabase();
    await createUserImgTable();

    // Check if image already exists
    const imgExistQuery =
      "SELECT COUNT(*) as count FROM user_img WHERE user_id = ?";
    const rows = await new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
        } else {
          connection.query(imgExistQuery, [user_id], (error, results) => {
            connection.release();
            if (error) {
              reject(error);
            } else {
              resolve(results);
            }
          });
        }
      });
    });

    // Validate the result
    if (!rows || rows.length === 0 || rows[0] === undefined) {
      throw new Error("Failed to retrieve count from user_img table.");
    }

    let query;
    const values = [img_url, user_id];

    // Update if image exists, else insert a new record
    if (rows[0].count > 0) {
      query = "UPDATE user_img SET url = ? WHERE user_id = ?";
    } else {
      query = "INSERT INTO user_img (url, user_id) VALUES (?, ?)";
    }

    const result = await new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
        } else {
          connection.query(query, values, (error, results) => {
            connection.release();
            if (error) {
              reject(error);
            } else {
              console.log(
                "Image URL updated or inserted for user ID:",
                user_id
              );
              resolve(results);
            }
          });
        }
      });
    });

    // Check if the operation was successful
    if (result.affectedRows > 0) {
      console.log("Operation successful for user ID:", user_id);
      return true; // Successfully updated or inserted
    } else {
      console.log("No rows affected.");
      return false; // No rows were updated or inserted
    }
  } catch (err) {
    console.error("Error in updating user image:", err);
    return false;
  }
}

export {
  updateUserName,
  updateUserEmail,
  updateUserPassword,
  updateDbUserImg,
  getDbUserImg,
};
