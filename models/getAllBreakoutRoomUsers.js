import { pool } from "./mysql.js";

async function getAllBreakoutRoomUsers(url_param) {
  let connection;
  try {
    // 取得連線
    connection = await pool.getConnection();

    // const breakouroomName = url_param.replace("breakout-", "");
    const breakouroomName = url_param;
    const breakoutRoomIdQuery = "SELECT id FROM breakout_room WHERE name = ?";
    const breakoutRoomIdValues = [breakouroomName];

    // Step 1: 查找 breakout room id
    const [breakoutRoomIdResult] = await connection.query(
      breakoutRoomIdQuery,
      breakoutRoomIdValues
    );

    if (breakoutRoomIdResult.length === 0) {
      console.error(`No breakout room found with name: ${breakouroomName}`);
    }

    const breakoutRoomId = breakoutRoomIdResult[0].id;

    // Step 2: 查找 users_rooms_relation 中的 user_id
    const userIdsQuery =
      "SELECT user_id FROM users_rooms_relation WHERE breakout_room_id = ?";
    const userIdsValues = [breakoutRoomId];

    const [userIdsResult] = await connection.query(userIdsQuery, userIdsValues);

    if (userIdsResult.length === 0) {
      console.error(`No users found for breakout room id: ${breakoutRoomId}`);
    }

    const userIds = userIdsResult.map((row) => row.user_id);

    // Step 3: 從 users 表中查找 user 資訊
    const usersQuery = `SELECT id, name, avatar_url FROM users WHERE id IN (?)`;
    const usersValues = [userIds];

    const [usersResult] = await connection.query(usersQuery, usersValues);

    return usersResult;
  } catch (err) {
    console.error("Error in findUsersInRoom:", err);
  } finally {
    // 確保連線正確釋放
    if (connection) {
      connection.release();
    }
  }
}

export { getAllBreakoutRoomUsers };
