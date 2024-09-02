import { pool, createDatabase, useDatabase } from "./mysql.js";

import { v4 as uuidv4 } from "uuid"; // 引入 uuid 庫來生成唯一的 groupId

async function saveGroups(groups) {
  try {
    console.log("groups: ", groups);
    await createDatabase();
    await useDatabase();
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
      console.log("groups[0]: ", groups[0]);
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
      group.groupId = uuidv4(); // 為每個組生成一個唯一的 groupId

      // 插入 breakout_room 表
      const breakoutRoomId = await new Promise((resolve, reject) => {
        const query = "INSERT INTO breakout_room (name) VALUES (?)";
        const values = [group.groupId];
        connection.query(query, values, (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve(results.insertId);
          }
        });
      });

      for (const member of group.group.members) {
        // 首先查找 users_rooms_relation 表中是否已有對應的 user_id 和 main_room_id
        const existingRelation = await new Promise((resolve, reject) => {
          const query =
            "SELECT id FROM users_rooms_relation WHERE user_id = ? AND main_room_id = ?";
          const values = [member.id, mainRoomId];
          connection.query(query, values, (error, results) => {
            if (error) {
              reject(error);
            } else if (results.length > 0) {
              resolve(results[0].id);
            } else {
              resolve(null);
            }
          });
        });

        if (existingRelation) {
          // 如果有找到記錄，更新 breakout_room_id
          await new Promise((resolve, reject) => {
            const query =
              "UPDATE users_rooms_relation SET breakout_room_id = ? WHERE id = ?";
            const values = [breakoutRoomId, existingRelation];
            connection.query(query, values, (error, results) => {
              if (error) {
                reject(error);
              } else {
                resolve(results.affectedRows);
              }
            });
          });
        } else {
          // 如果沒有找到記錄，插入新的記錄
          await new Promise((resolve, reject) => {
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
        }

        // 將 userId 和 groupName 添加到結果數組中
        resultArray.push({ userId: member.id, groupName: group.groupId });
      }
    }

    connection.release();
    return resultArray;
  } catch (err) {
    console.error("Error in saveGroups function:", err);
    throw err;
  }
}

export { saveGroups };
