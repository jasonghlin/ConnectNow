import { pool } from "./mysql.js";

async function insertUsersRoomsRelation(userInfo, mainRoomId, breakouRoomId) {
  let connection;
  try {
    const query =
      "UPDATE users_rooms_relation SET breakout_room_id = ? WHERE user_id = ? AND main_room_id = ?";
    const values = [breakouRoomId, userInfo.userId, mainRoomId];

    connection = await pool.getConnection();

    const [result] = await connection.query(query, values);

    return result.insertId;
  } catch (error) {
    console.log("Error in insertUsersRoomsRelation:", error);
  } finally {
    if (connection) connection.release();
  }
}

async function findMainRoom(roomName) {
  let connection;
  try {
    const query = "SELECT * FROM main_room WHERE name = ?";
    const values = [roomName];

    connection = await pool.getConnection();

    const [results] = await connection.query(query, values);

    return results;
  } catch (err) {
    console.error("Error in findMainRoom:", err);
  } finally {
    if (connection) connection.release();
  }
}

async function findBreakoutRoom(roomName) {
  let connection;
  try {
    const query = "SELECT * FROM breakout_room WHERE name = ?";
    const values = [roomName];

    connection = await pool.getConnection();

    const [results] = await connection.query(query, values);

    return results;
  } catch (err) {
    console.error("Error in findBreakoutRoom:", err);
  } finally {
    if (connection) connection.release();
  }
}

async function joinBreakoutRoom(userInfo, mainRoomName, breakouRoomName) {
  try {
    const mainRoom = await findMainRoom(mainRoomName);
    const breakoutRoom = await findBreakoutRoom(breakouRoomName);

    if (!mainRoom.length || !breakoutRoom.length) {
      console.error("Main room or breakout room not found");
    }

    const insertSuccess = await insertUsersRoomsRelation(
      userInfo,
      mainRoom[0].id,
      breakoutRoom[0].id
    );

    return !!insertSuccess;
  } catch (err) {
    console.error("Error in joinBreakoutRoom:", err);
  }
}

export { joinBreakoutRoom };
