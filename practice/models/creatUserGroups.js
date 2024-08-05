import {
  pool,
  createDatabase,
  useDatabase,
  createUserGroupsTable,
} from "./mysql.js";

import { v4 as uuidv4 } from "uuid"; // 引入 uuid 庫來生成唯一的 groupId

export async function saveGroups(groups) {
  try {
    for (const group of groups) {
      const groupId = uuidv4(); // 為每個組生成一個唯一的 groupId
      for (const member of group.members) {
        const query =
          "INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)";
        const values = [member.id, groupId];

        const connection = await new Promise((resolve, reject) => {
          pool.getConnection((err, connection) => {
            if (err) {
              reject(err);
            } else {
              resolve(connection);
            }
          });
        });

        await new Promise((resolve, reject) => {
          connection.query(query, values, (error, results, fields) => {
            connection.release();
            if (error) {
              reject(error);
            } else {
              console.log("User and group inserted with ID:", results.insertId);
              resolve(results);
            }
          });
        });
      }
    }
    return { success: true };
  } catch (err) {
    console.error("Error in saveGroups function:", err);
    throw err;
  }
}
