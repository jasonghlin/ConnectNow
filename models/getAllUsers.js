import { pool } from "./mysql.js";

async function getAllUsers(url_param) {
  let connection;
  try {
    // Step 1: 從 main_room 中取得名稱為 url_param 的 id
    const mainRoomIdQuery = "SELECT id FROM main_room WHERE name = ?";
    const mainRoomIdValues = [url_param];
    console.log("mainRoomIdValues:", mainRoomIdValues);

    // 取得連線
    connection = await pool.getConnection();

    // 查詢 main room id
    const [mainRoomIdResult] = await connection.query(
      mainRoomIdQuery,
      mainRoomIdValues
    );
    if (mainRoomIdResult.length === 0) {
      console.error(`No main room found with name: ${url_param}`);
    }

    const mainRoomId = mainRoomIdResult[0].id;

    // Step 2: 從 users_rooms_relation 中取得在 main_room_id 找到的 id 的用戶 id
    const userIdsQuery =
      "SELECT user_id FROM users_rooms_relation WHERE main_room_id = ?";
    const userIdsValues = [mainRoomId];

    // 查詢 user ids
    const [userIdsResult] = await connection.query(userIdsQuery, userIdsValues);
    if (userIdsResult.length === 0) {
      console.log(`No users found for main room id: ${mainRoomId}`);
      return false;
    }

    const userIds = userIdsResult.map((row) => row.user_id);

    // Step 3: 從 users 中取得 id 位於找到的 id list 中的 row
    const usersQuery = `SELECT id, name, avatar_url FROM users WHERE id IN (?)`;
    const usersValues = [userIds];
    console.log("usersValues.length: ", usersValues.length, usersValues);

    if (userIds.length === 0) {
      return false;
    }

    // 查詢 user details
    const [usersResult] = await connection.query(usersQuery, usersValues);

    return usersResult;
  } catch (err) {
    console.error("Error in findUsersInRoom:", err);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export { getAllUsers };
