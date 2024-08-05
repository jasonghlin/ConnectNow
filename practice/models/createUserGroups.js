import {
  pool,
  createDatabase,
  useDatabase,
  createUserGroupsTable,
} from "./mysql.js";

import { v4 as uuidv4 } from "uuid"; // 引入 uuid 庫來生成唯一的 groupId

export async function saveGroups(groups) {
  try {
    await createDatabase();
    await useDatabase();
    await createUserGroupsTable();
    // 建立一個資料庫連線池
    const connection = await new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
        } else {
          resolve(connection);
        }
      });
    });

    // 查找 mainRoom id
    const mainRoomId = await new Promise((resolve, reject) => {
      const query = "SELECT id FROM main_room WHERE name = ?";
      const values = [groups[0].mainRoom];
      connection.query(query, values, (error, results) => {
        if (error) {
          reject(error);
        } else if (results.length > 0) {
          resolve(results[0].id);
        } else {
          reject(new Error("Main room not found"));
        }
      });
    });

    const resultArray = [];

    for (const group of groups) {
      const groupId = uuidv4(); // 為每個組生成一個唯一的 groupId

      // 插入 breakout_room 表
      const breakoutRoomId = await new Promise((resolve, reject) => {
        const query =
          "INSERT INTO breakout_room (main_room_id, name) VALUES (?, ?)";
        const values = [mainRoomId, groupId];
        connection.query(query, values, (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve(results.insertId);
          }
        });
      });

      for (const member of group.group.members) {
        // 插入 users_rooms_relation 表
        const usersRoomsRelationId = await new Promise((resolve, reject) => {
          const query =
            "INSERT INTO users_rooms_relation (user_id, main_room_id, breakout_room_id) VALUES (?, ?, ?)";
          const values = [member.id, mainRoomId, breakoutRoomId];
          connection.query(query, values, (error, results) => {
            if (error) {
              reject(error);
            } else {
              resolve(results.insertId);
            }
          });
        });

        // 插入 user_groups 表
        await new Promise((resolve, reject) => {
          const query =
            "INSERT INTO user_groups (user_id, breakout_room_id) VALUES (?, ?)";
          const values = [member.id, breakoutRoomId];
          connection.query(query, values, (error, results) => {
            if (error) {
              reject(error);
            } else {
              console.log("User and group inserted with ID:", results.insertId);
              resolve(results);
            }
          });
        });

        // 將 userId 和 groupName 添加到結果數組中
        resultArray.push({ userId: member.id, groupName: groupId });
      }
    }

    connection.release();
    return resultArray;
  } catch (err) {
    console.error("Error in saveGroups function:", err);
    throw err;
  }
}
