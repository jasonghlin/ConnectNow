import {
  pool,
  createDatabase,
  useDatabase,
  createBreakoutRoomTable,
  createUsersRoomsRelationTable,
  createMainRoomTable,
} from "./mysql.js";

async function insertUsersRoomsRelation(userInfo, mainRoomId, breakouRoomId) {
  try {
    const query =
      "UPDATE  users_rooms_relation SET breakout_room_id = (?) WHERE user_id = (?) AND main_room_id = (?)";
    const values = [breakouRoomId, userInfo.userId, mainRoomId];

    return new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
          return;
        }
        connection.query(query, values, (error, results, fields) => {
          connection.release();
          if (error) {
            reject(error);
          } else {
            resolve(results.insertId);
          }
        });
      });
    });
  } catch (error) {
    console.log(error);
  }
}

async function findMainRoom(roomName) {
  try {
    await createDatabase();
    await useDatabase();
    await createMainRoomTable();
    await createUsersRoomsRelationTable();

    const query = "SELECT * FROM main_room WHERE name = (?)";
    const values = [roomName];
    return new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
          return;
        }
        connection.query(query, values, (error, results, fields) => {
          connection.release();
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        });
      });
    });
  } catch (err) {
    console.error("Error in find main_room:", err);
    throw err;
  }
}

async function findBreakoutRoom(roomName) {
  try {
    await createDatabase();
    await useDatabase();
    await createBreakoutRoomTable();
    await createUsersRoomsRelationTable();

    const query = "SELECT * FROM breakout_room WHERE name = (?)";
    const values = [roomName];
    return new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
          return;
        }
        connection.query(query, values, (error, results, fields) => {
          connection.release();
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        });
      });
    });
  } catch (err) {
    console.error("Error in find main_room:", err);
    throw err;
  }
}

async function joinBreakoutRoom(userInfo, mainRoomName, breakouRoomName) {
  try {
    await createDatabase();
    await useDatabase();
    await createBreakoutRoomTable();
    await createUsersRoomsRelationTable();
    const mainRoomId = await findMainRoom(mainRoomName);
    const breakouRoomId = await findBreakoutRoom(breakouRoomName);

    const insertSuccess = await insertUsersRoomsRelation(
      userInfo,
      mainRoomId[0].id,
      breakouRoomId[0].id
    );
    if (insertSuccess) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    console.error("Error in joinMainRoom:", err);
    throw err;
  }
}

export { joinBreakoutRoom };
