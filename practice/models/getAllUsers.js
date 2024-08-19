import {
  pool,
  createDatabase,
  useDatabase,
  createUserTable,
  createMainRoomTable,
  createUserRoomsRelationTable,
} from "./mysql.js";

async function getAllUsers(url_param) {
  try {
    await createDatabase();
    await useDatabase();
    await createUserTable();
    await createMainRoomTable();
    await createUserRoomsRelationTable();
    // Step 1: Get the id from main_room where name is url_param
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

    // Step 2: Get user ids from users_rooms_relation where main_room_id is the found id
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
      throw new Error(`No users found for main room id: ${mainRoomId}`);
    }

    const userIds = userIdsResult.map((row) => row.user_id);

    // Step 3: Get names from users where id is in the found user ids
    const usersQuery = `SELECT id, name, avatar_url FROM users WHERE id IN (?)`;
    const usersValues = [userIds];

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
