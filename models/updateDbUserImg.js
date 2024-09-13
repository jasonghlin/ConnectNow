import { pool, createDatabase, useDatabase } from "./mysql.js";

async function updateDbUserImg(user_id, img_url) {
  try {
    await createDatabase();
    await useDatabase();

    // 檢查使用者是否已經存在
    const imgExistQuery = "SELECT * FROM users WHERE id = ?";
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

    // Validate 結果
    if (!rows || rows.length === 0 || rows[0] === undefined) {
      console.log("no image exist");
    }

    let query;
    const values = [img_url, user_id];

    // 如果 image 已存在就 update，反之 insert new record
    if (rows.length > 0) {
      query = "UPDATE users SET avatar_url = ? WHERE id = ?";
    } else {
      query = "INSERT INTO users (avatar_url, id) VALUES (?, ?)";
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

    // 檢查操作是否成功
    if (result.affectedRows > 0) {
      console.log("Operation successful for user ID:", user_id);
      return true;
    } else {
      console.log("No rows affected.");
      return false;
    }
  } catch (err) {
    console.error("Error in updating user image:", err);
    return false;
  }
}

export { updateDbUserImg };
