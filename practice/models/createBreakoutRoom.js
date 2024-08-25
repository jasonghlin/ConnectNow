import {
  pool,
  createDatabase,
  useDatabase,
  createBreakoutRoomTable,
} from "./mysql.js";

async function createBreakoutRoom(roomId) {
  try {
    await createDatabase();
    await useDatabase();
    await createBreakoutRoomTable();
    const query = "INSERT INTO breakout_room (name) VALUES (?)";
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
  } catch (error) {
    console.log(error);
  }
}

export { createBreakoutRoom };
