import { pool, createBreakoutRoomTable } from "./mysql.js";

export async function createBreakoutRooms(mainRoomId, numberOfRooms) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const createdRooms = [];
    for (let i = 0; i < numberOfRooms; i++) {
      const [result] = await connection.query(
        "INSERT INTO breakout_room (main_room_id, name) VALUES (?, ?)",
        [mainRoomId, `Breakout Room ${i + 1}`]
      );
      createdRooms.push({
        id: result.insertId,
        name: `Breakout Room ${i + 1}`,
        main_room_id: mainRoomId,
      });
    }

    await connection.commit();
    return createdRooms;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
