import {
  pool,
  createDatabase,
  useDatabase,
  createUsersRoomsRelationTable,
} from "./mysql.js";

async function findMainRoomIdByName(roomName) {
  await createDatabase();
  await useDatabase();
  await createUsersRoomsRelationTable();
  const query = "SELECT id FROM main_room WHERE name = ?";
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
          if (results.length > 0) {
            resolve(results[0].id); // 返回 main_room_id
          } else {
            resolve(null); // 如果找不到，返回 null
          }
        }
      });
    });
  });
}

async function findMainRoomAdmin(mainRoomName) {
  const mainRoomId = await findMainRoomIdByName(mainRoomName);
  console.log("mainRoomId: ", mainRoomId);
  const query =
    "SELECT * FROM users_rooms_relation WHERE main_room_id = (?) AND admin_user_id IS NOT NULL";
  const values = [mainRoomId];

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
}

export { findMainRoomAdmin };
