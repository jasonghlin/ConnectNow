import { pool } from "./mysql.js";

async function insertUsersRoomsRelation(userInfo, mainRoomId) {
  const query =
    "INSERT INTO users_rooms_relation (user_id, main_room_id, admin_user_id) VALUES (?, ?, ?)";
  const values = [userInfo.userId, mainRoomId, userInfo.userId];

  const connection = await pool.getConnection();
  try {
    const [results] = await connection.query(query, values);
    return results.insertId;
  } catch (error) {
    console.error("Error in insertUsersRoomsRelation function: ", error);
  } finally {
    connection.release();
  }
}

async function findRoom(roomName) {
  const query = "SELECT * FROM main_room WHERE name = (?)";
  const values = [roomName];

  const connection = await pool.getConnection();
  try {
    const [results] = await connection.query(query, values);
    return results;
  } catch (error) {
    console.error("Error in findRoom function: ", error);
  } finally {
    connection.release();
  }
}

async function checkUserInRoom(userInfo, roomName) {
  const mainRoomId = await findRoom(roomName);
  const query =
    "SELECT * FROM users_rooms_relation WHERE user_id = (?) AND main_room_id = (?)";
  const values = [userInfo.userId, mainRoomId[0].id];

  const connection = await pool.getConnection();
  try {
    const [results] = await connection.query(query, values);
    return results;
  } catch (error) {
    console.error("Error in checkUserInRoom function: ", error);
  } finally {
    connection.release(); // 確保連線被釋放
  }
}

async function adminJoinMainRoom(userInfo, roomName) {
  const isUserInRoom = await checkUserInRoom(userInfo, roomName);
  if (isUserInRoom.length === 0) {
    const mainRoomId = await findRoom(roomName);
    const insertSuccess = await insertUsersRoomsRelation(
      userInfo,
      mainRoomId[0].id
    );
    return insertSuccess ? true : false;
  } else {
    return false;
  }
}

export { adminJoinMainRoom };
