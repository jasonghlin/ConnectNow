import {
  pool,
  createDatabase,
  useDatabase,
  createMainRoomTable,
} from "./mysql.js";

export async function checkIsAdmin(roomId, userId) {
  try {
    await createDatabase();
    await useDatabase();
    await createMainRoomTable();

    const query = "SELECT * FROM main_room WHERE name = (?) AND admin = (?)";
    const values = [roomId, userId];
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