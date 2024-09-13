import {
  pool,
  createDatabase,
  useDatabase,
  createUserTable,
  createBreakoutRoomTable,
  createUsersRoomsRelationTable,
} from "./mysql.js";

async function getAllBreakoutRoomUsers(url_param) {
  try {
    await createDatabase();
    await useDatabase();
    await createUserTable();
    await createBreakoutRoomTable();
    await createUsersRoomsRelationTable();
    // Step 1: 從 breakout_room 中取得名稱為 url_param 的 id
    const breakouroomName = url_param.replace("breakout-", "");
    const breakoutRoomIdQuery = "SELECT id FROM breakout_room WHERE name = ?";
    const breakoutRoomIdValues = [breakouroomName];
    console.log("breakoutRoomIdValues:", breakoutRoomIdValues);
    const breakoutRoomIdResult = await new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
          return;
        }
        connection.query(
          breakoutRoomIdQuery,
          breakoutRoomIdValues,
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

    if (breakoutRoomIdResult.length === 0) {
      throw new Error(`No breakout room found with name: ${breakouroomName}`);
    }

    const breakoutRoomId = breakoutRoomIdResult[0].id;

    // Step 2: 從 users_rooms_relation 中取得在 breakout_room 找到的 id 的用戶 id
    const userIdsQuery =
      "SELECT user_id FROM users_rooms_relation WHERE breakout_room_id = ?";
    const userIdsValues = [breakoutRoomId];

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
      throw new Error(`No users found for breakout room id: ${breakoutRoomId}`);
    }

    const userIds = userIdsResult.map((row) => row.user_id);

    // Step 3: 從 users 中取得 id 位於找到的 id list 中的 row
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

export { getAllBreakoutRoomUsers };
