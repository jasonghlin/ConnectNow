import { pool } from "./mysql.js";
import { v4 as uuidv4 } from "uuid";

async function saveGroups(groups) {
  let connection;
  try {
    console.log("groups: ", groups);

    connection = await pool.getConnection();

    // 查找 mainRoom id
    const queryMainRoomId = "SELECT id FROM main_room WHERE name = ?";
    const mainRoomIdResults = await connection.query(queryMainRoomId, [
      groups[0].mainRoom,
    ]);

    if (mainRoomIdResults.length === 0) {
      console.error("Main room not found");
    }

    const mainRoomId = mainRoomIdResults[0].id;

    const resultArray = [];

    for (const group of groups) {
      group.groupId = uuidv4();

      // 插入 breakout_room 表
      const queryInsertBreakoutRoom =
        "INSERT INTO breakout_room (name) VALUES (?)";
      const breakoutRoomInsertResult = await connection.query(
        queryInsertBreakoutRoom,
        [group.groupId]
      );
      const breakoutRoomId = breakoutRoomInsertResult.insertId;

      for (const member of group.group.members) {
        // 查找 users_rooms_relation 表中是否已有對應的 user_id 和 main_room_id
        const queryCheckRelation =
          "SELECT id FROM users_rooms_relation WHERE user_id = ? AND main_room_id = ?";
        const existingRelationResults = await connection.query(
          queryCheckRelation,
          [member.id, mainRoomId]
        );

        if (existingRelationResults.length > 0) {
          // 如果有找到記錄，更新 breakout_room_id
          const queryUpdateRelation =
            "UPDATE users_rooms_relation SET breakout_room_id = ? WHERE id = ?";
          await connection.query(queryUpdateRelation, [
            breakoutRoomId,
            existingRelationResults[0].id,
          ]);
        } else {
          // 如果沒有找到記錄，插入新的記錄
          const queryInsertRelation =
            "INSERT INTO users_rooms_relation (user_id, main_room_id, breakout_room_id) VALUES (?, ?, ?)";
          await connection.query(queryInsertRelation, [
            member.id,
            mainRoomId,
            breakoutRoomId,
          ]);
        }

        // 將 userId 和 groupName 添加到結果數組中
        resultArray.push({ userId: member.id, groupName: group.groupId });
      }
    }

    return resultArray;
  } catch (err) {
    console.error("Error in saveGroups function:", err);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export { saveGroups };
