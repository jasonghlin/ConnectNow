import {
  pool,
  createDatabase,
  useDatabase,
  createUserTable,
  createMainRoomTable,
  createUsersRoomsRelationTable,
  createRoomVideoSrtUrlTable,
} from "./mysql.js";

async function createRoomVideoSrtUrl(roomName, adminUserId) {
  try {
    await createDatabase();
    await useDatabase();
    await createUserTable();
    await createMainRoomTable();
    await createUsersRoomsRelationTable();
    await createRoomVideoSrtUrlTable();

    const connection = await new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
        } else {
          resolve(connection);
        }
      });
    });

    const mainRoomId = await new Promise((resolve, reject) => {
      const query = "SELECT id FROM main_room WHERE name = ?";
      connection.query(query, [roomName], (error, results) => {
        if (error) {
          connection.release();
          reject(error);
        } else if (results.length === 0) {
          connection.release();
          reject(new Error("Room not found"));
        } else {
          resolve(results[0].id);
        }
      });
    });

    await new Promise((resolve, reject) => {
      const insertQuery =
        "INSERT INTO room_video_srt (admin_user_id, main_room_id) VALUES (?, ?)";
      connection.query(
        insertQuery,
        [adminUserId, mainRoomId],
        (error, results) => {
          connection.release();
          if (error) {
            reject(error);
          } else {
            console.log(
              "Record inserted into room_srt table with ID:",
              results.insertId
            );
            resolve(results.insertId);
          }
        }
      );
    });
  } catch (err) {
    console.error("Error in createRoomVideoSrtUrl function:", err);
  }
}
export { createRoomVideoSrtUrl };
