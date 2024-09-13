import {
  pool,
  createDatabase,
  useDatabase,
  createMainRoomTable,
  createUsersRoomsRelationTable,
} from "./mysql.js";

async function insertUsersRoomsRelation(userId, mainRoomId, roomAdmin) {
  const query =
    "INSERT INTO users_rooms_relation (user_id, main_room_id, admin_user_id) VALUES (?, ?, ?)";
  const values = [userId, mainRoomId, roomAdmin];

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

async function findRoom(roomName) {
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

async function checkUserInRoom(userId, roomName) {
  try {
    await createDatabase();
    await useDatabase();
    await createMainRoomTable();
    await createUsersRoomsRelationTable();
    const mainRoomId = await findRoom(roomName);
    const query =
      "SELECT * FROM users_rooms_relation WHERE user_id = (?) AND main_room_id = (?)";
    const values = [userId, mainRoomId[0].id];
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
    console.error("Error in checkUserInRoom:", err);
    throw err;
  }
}

async function joinMainRoom(userId, roomName, roomAdminId) {
  try {
    await createDatabase();
    await useDatabase();
    await createMainRoomTable();
    await createUsersRoomsRelationTable();
    const isUserInRoom = await checkUserInRoom(userId, roomName);

    if (isUserInRoom.length !== 0) {
      return false;
    }

    const mainRoomId = await findRoom(roomName);
    const insertSuccess = await insertUsersRoomsRelation(
      userId,
      mainRoomId[0].id,
      roomAdminId
    );

    return insertSuccess ? true : false;
  } catch (err) {
    console.error("Error in joinMainRoom:", err);
    throw err;
  }
}

export { joinMainRoom };
