import { pool, createBreakoutRoomTable } from "./mysql.js";

export async function assignUsersToBreakoutRooms(
  mainRoomId,
  breakoutRoomAssignments
) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const [userId, breakoutRoomId] of Object.entries(
      breakoutRoomAssignments
    )) {
      await connection.query(
        "UPDATE users_rooms_relation SET breakout_room_id = ? WHERE user_id = ? AND main_room_id = ?",
        [breakoutRoomId, userId, mainRoomId]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
