import {
  pool,
  createDatabase,
  useDatabase,
  createMainRoomTable,
  createBreakoutRoomTable,
  createUserRoomsRelationTable,
} from "./mysql.js";

async function insertMainRoom(roomId) {
  const query = "INSERT INTO main_room (name) VALUES (?)";
  const values = [roomId];

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
}

async function insertUsersRoomsRelation(userInfo, mainRoomId) {
  const query =
    "INSERT INTO users_rooms_relation (user_id, main_room_id) VALUES (?, ?)";
  const values = [userInfo.userId, mainRoomId];

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
}

async function insertRoomInfo(userInfo, roomId) {
  try {
    await createDatabase();
    await useDatabase();
    await createMainRoomTable();
    await createBreakoutRoomTable();
    await createUserRoomsRelationTable();

    const mainRoomId = await insertMainRoom(roomId);
    await insertUsersRoomsRelation(userInfo, mainRoomId);
  } catch (err) {
    console.error("Error in Insert main_room:", err);
    throw err;
  }
}

async function findRoom(roomId) {
  try {
    await createDatabase();
    await useDatabase();
    await createMainRoomTable();
    await createBreakoutRoomTable();
    await createUserRoomsRelationTable();

    const query = "SELECT * FROM main_room WHERE name = (?)";
    const values = [roomId];
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
    console.error("Error in Insert main_room:", err);
    throw err;
  }
}

async function findAllRooms() {
  try {
    await createDatabase();
    await useDatabase();
    await createMainRoomTable();
    await createBreakoutRoomTable();
    await createUserRoomsRelationTable();

    const query = "SELECT * FROM main_room";
    const values = [];
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
    console.error("Error in Insert main_room:", err);
    throw err;
  }
}

async function checkUserInRoom(userInfo, roomId) {
  try {
    await createDatabase();
    await useDatabase();
    await createMainRoomTable();
    await createBreakoutRoomTable();
    await createUserRoomsRelationTable();
    const mainRoomId = await findRoom(roomId);
    const query =
      "SELECT * FROM users_rooms_relation WHERE user_id = (?) AND main_room_id = (?)";
    const values = [userInfo.userId, mainRoomId[0].id];
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
    console.error("Error in Insert main_room:", err);
    throw err;
  }
}

async function joinRoomInfo(userInfo, roomId) {
  try {
    await createDatabase();
    await useDatabase();
    await createMainRoomTable();
    await createBreakoutRoomTable();
    await createUserRoomsRelationTable();
    const isUserInRoom = await checkUserInRoom(userInfo, roomId);
    // console.log(isUserInRoom);
    if (isUserInRoom.length === 0) {
      const mainRoomId = await findRoom(roomId);
      await insertUsersRoomsRelation(userInfo, mainRoomId[0].id);
    } else {
      return false;
    }
  } catch (err) {
    console.error("Error in Insert main_room:", err);
    throw err;
  }
}

export { insertRoomInfo, findRoom, findAllRooms, joinRoomInfo };
