import {
  pool,
  createDatabase,
  useDatabase,
  createUserTable,
  createMainRoomTable,
  createUserRoomsRelationTable,
} from "./mysql.js";

async function removeUserFromRoom(userInfo, roomId) {
  try {
    await createDatabase();
    await useDatabase();
    await createUserTable();
    await createMainRoomTable();
    await createUserRoomsRelationTable();
    const query = "";
    const values = [name, email, hash_password];

    pool.getConnection((err, connection) => {
      if (err) throw err;
      connection.query(query, values, (error, results, fields) => {
        connection.release();
        if (error) {
          throw error;
        }
        console.log("User inserted with ID:", results.insertId);
      });
    });
  } catch (err) {
    console.error("Error in createUser function:", err);
  }
}
