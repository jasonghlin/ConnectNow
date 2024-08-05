import {
  pool,
  createDatabase,
  useDatabase,
  createUserGroupsTable,
} from "./mysql.js";

import { v4 as uuidv4 } from "uuid";

async function getMainRoomId(mainRoomName) {
  const query = "SELECT id FROM main_room WHERE name = ?";
  const values = [mainRoomName];

  const connection = await new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
      } else {
        resolve(connection);
      }
    });
  });

  const result = await new Promise((resolve, reject) => {
    connection.query(query, values, (error, results, fields) => {
      connection.release();
      if (error) {
        reject(error);
      } else {
        resolve(results[0]?.id);
      }
    });
  });

  return result;
}

async function createBreakoutRoom(mainRoomId, groupName) {
  const query = "INSERT INTO breakout_room (main_room_id, name) VALUES (?, ?)";
  const values = [mainRoomId, groupName];

  const connection = await new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
      } else {
        resolve(connection);
      }
    });
  });

  const result = await new Promise((resolve, reject) => {
    connection.query(query, values, (error, results, fields) => {
      connection.release();
      if (error) {
        reject(error);
      } else {
        resolve(results.insertId);
      }
    });
  });

  return result;
}

async function insertUserRoomRelation(userId, mainRoomId, breakoutRoomId) {
  const query =
    "INSERT INTO users_rooms_relation (user_id, main_room_id, breakout_room_id) VALUES (?, ?, ?)";
  const values = [userId, mainRoomId, breakoutRoomId];

  const connection = await new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
      } else {
        resolve(connection);
      }
    });
  });

  const result = await new Promise((resolve, reject) => {
    connection.query(query, values, (error, results, fields) => {
      connection.release();
      if (error) {
        reject(error);
      } else {
        resolve(results.insertId);
      }
    });
  });

  return result;
}

async function insertUserGroup(userId, userRoomRelationId) {
  const query = "INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)";
  const values = [userId, userRoomRelationId];

  const connection = await new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
      } else {
        resolve(connection);
      }
    });
  });

  const result = await new Promise((resolve, reject) => {
    connection.query(query, values, (error, results, fields) => {
      connection.release();
      if (error) {
        reject(error);
      } else {
        resolve(results.insertId);
      }
    });
  });

  return result;
}

async function createUserGroups(groups, mainRoomName) {
  const result = [];
  try {
    const mainRoomId = await getMainRoomId(mainRoomName);
    if (!mainRoomId) {
      throw new Error("Main room not found");
    }

    for (const group of groups) {
      const groupName = uuidv4(); // 為每個組生成一個唯一的 groupName
      const breakoutRoomId = await createBreakoutRoom(mainRoomId, groupName);

      for (const member of group.members) {
        const userRoomRelationId = await insertUserRoomRelation(
          member.id,
          mainRoomId,
          breakoutRoomId
        );
        await insertUserGroup(member.id, userRoomRelationId);

        console.log(`User and group inserted with groupName: ${groupName}`);
        result.push({ userId: member.id, groupName });
      }
    }

    return result;
  } catch (err) {
    console.error("Error in createUserGroups function:", err);
    throw err;
  }
}

export { createUserGroups };
