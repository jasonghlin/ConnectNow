import {
  pool,
  createDatabase,
  useDatabase,
  createUserTable,
  createMainRoomTable,
  createUsersRoomsRelationTable,
} from "./mysql.js";

async function getAllUsers(url_param) {
  try {
    await createDatabase();
    await useDatabase();
    await createUserTable();
    await createMainRoomTable();
    await createUsersRoomsRelationTable();
    // Step 1: 從 main_room 中取得名稱為 url_param 的 id
    const mainRoomIdQuery = "SELECT id FROM main_room WHERE name = ?";
    const mainRoomIdValues = [url_param];
    console.log("mainRoomIdValues:", mainRoomIdValues);
    const mainRoomIdResult = await new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
          return;
        }
        connection.query(
          mainRoomIdQuery,
          mainRoomIdValues,
          (error, results) => {
            connection.release();
            if (error) {
              reject(error);
            } else {
              resolve(results);
            }
          }
        );
      });
    });

    if (mainRoomIdResult.length === 0) {
      throw new Error(`No main room found with name: ${url_param}`);
    }

    const mainRoomId = mainRoomIdResult[0].id;

    // Step 2: 從 users_rooms_relation 中取得在 main_room_id 找到的 id 的用戶 id
    const userIdsQuery =
      "SELECT user_id FROM users_rooms_relation WHERE main_room_id = ?";
    const userIdsValues = [mainRoomId];

    const userIdsResult = await new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
          return;
        }
        connection.query(userIdsQuery, userIdsValues, (error, results) => {
          connection.release();
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        });
      });
    });

    if (userIdsResult.length === 0) {
      console.log(`No users found for main room id: ${mainRoomId}`);
    }

    const userIds = userIdsResult.map((row) => row.user_id);

    // Step 3: 從 users 中取得 id 位於找到的 id list 中的 row
    const usersQuery = `SELECT id, name, avatar_url FROM users WHERE id IN (?)`;
    const usersValues = [userIds];
    console.log("usersValues.length: ", usersValues.length, usersValues);
    if (userIds.length === 0) {
      return false;
    }

    const usersResult = await new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
          return;
        }
        connection.query(usersQuery, usersValues, (error, results) => {
          connection.release();
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        });
      });
    });

    return usersResult;
  } catch (err) {
    console.error("Error in findUsersInRoom:", err);
    throw err;
  }
}

export { getAllUsers };
