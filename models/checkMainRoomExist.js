import { pool } from "./mysql.js";

async function checkMainRoomExist(roomName) {
  const checkMainRoomExistQuery = "SELECT * FROM main_room WHERE name = (?)";
  const mainRoomValues = [roomName];
  let connection;

  try {
    // 取得連線
    connection = await pool.getConnection();

    // 執行查詢
    const [results] = await connection.query(
      checkMainRoomExistQuery,
      mainRoomValues
    );

    // 若查到結果，回傳結果；否則回傳 false
    return results.length > 0 ? results : false;
  } catch (err) {
    console.error("Error in checkMainRoomExist:", err);
    throw err;
  } finally {
    // 確保連線被釋放
    if (connection) connection.release();
  }
}

export { checkMainRoomExist };
