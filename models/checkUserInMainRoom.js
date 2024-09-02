import {
  pool,
  createDatabase,
  useDatabase,
  createMainRoomTable,
  createUsersRoomsRelationTable,
} from "./mysql.js";

export async function checkUserInMainRoom(roomName, adminId) {
  try {
    await createDatabase();
    await useDatabase();
    await createMainRoomTable();
    await createUsersRoomsRelationTable();

    // 先從 main_room table 查詢房間 id
    const getMainRoomIdQuery = "SELECT id FROM main_room WHERE name = (?)";
    const mainRoomValues = [roomName];

    const mainRoomId = await new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
          return;
        }
        connection.query(
          getMainRoomIdQuery,
          mainRoomValues,
          (error, results) => {
            connection.release();
            if (error) {
              reject(error);
            } else if (results.length > 0) {
              resolve(results[0].id); // 取得房間的 id
            } else {
              resolve(null); // 如果找不到房間，回傳 null
            }
          }
        );
      });
    });

    if (!mainRoomId) {
      return false;
    }

    // 使用 mainRoomId 到 users_rooms_relation table 查詢
    const checkUserQuery =
      "SELECT * FROM users_rooms_relation WHERE main_room_id = (?) AND user_id = (?)";
    const checkUserValues = [mainRoomId, adminId];

    return new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
          return;
        }
        connection.query(checkUserQuery, checkUserValues, (error, results) => {
          connection.release();
          if (error) {
            reject(error);
          } else {
            resolve(results); // 回傳結果
          }
        });
      });
    });
  } catch (err) {
    console.error("Error in checkUserInMainRoom:", err);
    throw err;
  }
}
