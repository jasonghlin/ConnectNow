import { pool, createDatabase, useDatabase, createUserTable } from "./mysql.js";

async function deleteUserInUserGroups(userId) {
  try {
    await createDatabase();
    await useDatabase();
    await createUserTable();

    const query = "DELETE FROM user_groups WHERE user_id = ?";
    const values = [userId];

    const connection = await new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
        } else {
          resolve(connection);
        }
      });
    });

    const results = await new Promise((resolve, reject) => {
      connection.query(query, values, (error, results) => {
        connection.release();
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });

    console.log("User deleted from user_groups with ID:", userId);
    return results;
  } catch (err) {
    console.error("Error in deleteUser function:", err);
    throw err;
  }
}

async function deleteUserInUsersRoomsRelation(userId) {
  try {
    await createDatabase();
    await useDatabase();
    await createUserTable();

    const query = "DELETE FROM users_rooms_relation WHERE user_id = ?";
    const values = [userId];

    const connection = await new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
        } else {
          resolve(connection);
        }
      });
    });

    const results = await new Promise((resolve, reject) => {
      connection.query(query, values, (error, results) => {
        connection.release();
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });

    console.log("User deleted from users_rooms_relation with ID:", userId);
    return results;
  } catch (err) {
    console.error("Error in deleteUser function:", err);
    throw err;
  }
}

async function deleteUserInMainRoom(userId) {
  try {
    await createDatabase();
    await useDatabase();
    await createUserTable();

    const query = "DELETE FROM main_room WHERE admin = ?";
    const values = [userId];

    const connection = await new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
        } else {
          resolve(connection);
        }
      });
    });

    const results = await new Promise((resolve, reject) => {
      connection.query(query, values, (error, results) => {
        connection.release();
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });

    console.log("User deleted from main room with ID:", userId);
    return results;
  } catch (err) {
    console.error("Error in deleteUser function:", err);
    throw err;
  }
}

async function deleteUser(userId) {
  try {
    await createDatabase();
    await useDatabase();
    await createUserTable();

    const query = "DELETE FROM users WHERE id = ?";
    const values = [userId];

    const connection = await new Promise((resolve, reject) => {
      pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
        } else {
          resolve(connection);
        }
      });
    });

    const results = await new Promise((resolve, reject) => {
      connection.query(query, values, (error, results) => {
        connection.release();
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });

    console.log("User deleted with ID:", userId);
    return results;
  } catch (err) {
    console.error("Error in deleteUser function:", err);
    throw err;
  }
}

export {
  deleteUserInUserGroups,
  deleteUserInUsersRoomsRelation,
  deleteUserInMainRoom,
  deleteUser,
};
