import { pool } from "./mysql.js";

async function removeUserFromMainRoom(mainRoomName, userId) {
  try {
    // 先取得 main_room_id
    const getMainRoomIdQuery = "SELECT id FROM main_room WHERE name = ?";
    const mainRoomId = await new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
        } else {
          connection.query(
            getMainRoomIdQuery,
            [mainRoomName],
            (error, results) => {
              connection.release();
              if (error) {
                reject(error);
              } else if (results.length > 0) {
                resolve(results[0].id);
              } else {
                reject(new Error("Main room not found"));
              }
            }
          );
        }
      });
    });

    const query =
      "DELETE FROM users_rooms_relation WHERE user_id = ? AND main_room_id = ?";
    const values = [userId, mainRoomId];

    const connection = await new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
        } else {
          resolve(connection);
        }
      });
    });

    const results = await new Promise((resolve, reject) => {
      connection.query(query, values, (error, results) => {
        connection.release();
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });

    console.log("User deleted from users_rooms_relation with ID:", userId);
    return results;
  } catch (err) {
    console.error("Error in deleteUser function:", err);
    throw err;
  }
}

export { removeUserFromMainRoom };
