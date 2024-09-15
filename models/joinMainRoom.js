import { pool } from "./mysql.js";

async function insertUsersRoomsRelation(userId, mainRoomId, roomAdmin) {
  const query =
    "INSERT INTO users_rooms_relation (user_id, main_room_id, admin_user_id) VALUES (?, ?, ?)";
  const values = [userId, mainRoomId, roomAdmin];

  let connection;
  try {
    connection = await pool.getConnection();
    const [result] = await connection.query(query, values);
    return result.insertId;
  } catch (err) {
    console.error("Error in insertUsersRoomsRelation function: ", err);
  } finally {
    if (connection) connection.release();
  }
}

async function findRoom(roomName) {
  const query = "SELECT * FROM main_room WHERE name = (?)";
  const values = [roomName];

  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.query(query, values);
    return results;
  } catch (err) {
    console.error("Error in find main_room:", err);
  } finally {
    if (connection) connection.release();
  }
}

async function checkUserInRoom(userId, roomName) {
  try {
    const mainRoom = await findRoom(roomName);
    const mainRoomId = mainRoom[0].id;

    const query =
      "SELECT * FROM users_rooms_relation WHERE user_id = (?) AND main_room_id = (?)";
    const values = [userId, mainRoomId];

    let connection;
    try {
      connection = await pool.getConnection();
      const [results] = await connection.query(query, values);
      return results;
    } catch (err) {
      console.error("Error in checkUserInRoom function: ", err);
    } finally {
      if (connection) connection.release();
    }
  } catch (err) {
    console.error("Error in checkUserInRoom:", err);
  }
}

async function joinMainRoom(userId, roomName, roomAdminId) {
  try {
    const isUserInRoom = await checkUserInRoom(userId, roomName);

    if (isUserInRoom.length !== 0) {
      return false;
    }

    const mainRoom = await findRoom(roomName);
    const mainRoomId = mainRoom[0].id;

    const insertSuccess = await insertUsersRoomsRelation(
      userId,
      mainRoomId,
      roomAdminId
    );

    return insertSuccess ? true : false;
  } catch (err) {
    console.error("Error in joinMainRoom:", err);
  }
}

export { joinMainRoom };
