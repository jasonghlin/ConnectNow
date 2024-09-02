import {
  pool,
  createDatabase,
  useDatabase,
  createBreakoutRoomTable,
  createUsersRoomsRelationTable,
  createMainRoomTable,
} from "./mysql.js";

async function updateMainRoomAdmin(newAdminId, roomName) {
  try {
    const mainRoomId = await findMainRoom(roomName);
    const query =
      "UPDATE  users_rooms_relation SET admin_user_id = (?) WHERE main_room_id = (?)";
    const values = [newAdminId, mainRoomId[0].id];

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

export { updateMainRoomAdmin };
