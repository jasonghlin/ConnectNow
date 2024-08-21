import {
  pool,
  createDatabase,
  useDatabase,
  createMainRoomTable,
} from "./mysql.js";

async function checkMainRoomExist(roomName) {
  try {
    await createDatabase();
    await useDatabase();
    await createMainRoomTable();

    // 先從 main_room table 查詢房間 id
    const checkMainRoomExistQuery = "SELECT * FROM main_room WHERE name = (?)";
    const mainRoomValues = [roomName];

    return new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
          return;
        }
        connection.query(
          checkMainRoomExistQuery,
          mainRoomValues,
          (error, results) => {
            connection.release();
            if (error) {
              reject(error);
            } else if (results.length > 0) {
              resolve(results);
            } else {
              resolve(false);
            }
          }
        );
      });
    });
  } catch (err) {
    console.error("Error in checkMainRoomExist:", err);
    throw err;
  }
}

export { checkMainRoomExist };
