import { pool, createDatabase, useDatabase, createUserTable } from "./mysql.js";

async function deleteUserInUserGroups(userId) {
  try {
    await createDatabase();
    await useDatabase();
    await createUserTable();

    const query = "DELETE FROM user_groups WHERE user_id = ?";
    const values = [userId];

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

    console.log("User deleted from user_groups with ID:", userId);
    return results;
  } catch (err) {
    console.error("Error in deleteUser function:", err);
    throw err;
  }
}

async function deleteUserInUsersRoomsRelation(userId, mainRoomName) {
  try {
    await createDatabase();
    await useDatabase();
    await createUserTable();

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

async function deleteUserInMainRoom(userId) {
  try {
    await createDatabase();
    await useDatabase();
    await createUserTable();

    const query = "DELETE FROM main_room WHERE admin = ?";
    const values = [userId];

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

    console.log("User deleted from main room with ID:", userId);
    return results;
  } catch (err) {
    console.error("Error in deleteUser function:", err);
    throw err;
  }
}

export {
  deleteUserInUserGroups,
  deleteUserInUsersRoomsRelation,
  deleteUserInMainRoom,
};
