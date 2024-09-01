import {
  pool,
  createDatabase,
  useDatabase,
  createUserTable,
  createMainRoomTable,
  createUsersRoomsRelationTable,
  createRoomVideoSrtUrlTable,
} from "./mysql.js";

async function updateRoomConvertedVideoUrl(roomName, videoUrl) {
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
      const updateQuery =
        "UPDATE room_video_srt SET video_url = ? WHERE main_room_id = ? AND video_url = 'Pending'";
      connection.query(
        updateQuery,
        [videoUrl, mainRoomId],
        (error, results) => {
          connection.release();
          if (error) {
            reject(error);
          } else if (results.affectedRows === 0) {
            reject(new Error("No matching records found to update"));
          } else {
            console.log(
              "video_url updated for room_video_srt with main_room_id:",
              mainRoomId
            );
            resolve(results);
          }
        }
      );
    });
  } catch (err) {
    console.error("Error in updateRoomConvertedVideoUrl function:", err);
  }
}

export { updateRoomConvertedVideoUrl };
