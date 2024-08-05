import dotenv from "dotenv";
dotenv.config();
import mysql from "mysql";

const { MYSQL_USER, MYSQL_HOST, MYSQL_PASSWORD, ENV } = process.env;

let pool;

if (ENV === "production") {
  pool = mysql.createPool({
    connectionLimit: 10,
    host: MYSQL_HOST,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
  });
} else {
  pool = mysql.createPool({
    connectionLimit: 10,
    host: "localhost",
    user: "root",
    password: MYSQL_PASSWORD,
  });
}

function createDatabase() {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) return reject(err);
      connection.query(
        "CREATE DATABASE IF NOT EXISTS ConnectNow",
        (error, results) => {
          connection.release();
          if (error) return reject(error);
          console.log("Database created");
          resolve();
        }
      );
    });
  });
}

function useDatabase() {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) return reject(err);
      connection.query("USE ConnectNow", (error, results) => {
        connection.release();
        if (error) return reject(error);
        console.log("Using ConnectNow");
        resolve();
      });
    });
  });
}

function createUserTable() {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) return reject(err);
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name NVARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          avatar VARCHAR(255)
        )
      `;
      connection.query(createTableQuery, (error, results) => {
        connection.release();
        if (error) return reject(error);
        console.log("users table created");
        resolve();
      });
    });
  });
}

function createMainRoomTable() {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) return reject(err);
      const createTableQuery = `
          CREATE TABLE IF NOT EXISTS main_room (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name NVARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
      connection.query(createTableQuery, (error, results) => {
        connection.release();
        if (error) return reject(error);
        console.log("users table created");
        resolve();
      });
    });
  });
}

function createBreakoutRoomTable() {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) return reject(err);
      const createTableQuery = `
            CREATE TABLE IF NOT EXISTS breakout_room (
              id INT AUTO_INCREMENT PRIMARY KEY,
              main_room_id INT,
              name VARCHAR(255) UNIQUE NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (main_room_id) REFERENCES main_room(id)
            )
          `;
      connection.query(createTableQuery, (error, results) => {
        connection.release();
        if (error) return reject(error);
        console.log("users table created");
        resolve();
      });
    });
  });
}

function createUserRoomsRelationTable() {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) return reject(err);
      const createTableQuery = `
          CREATE TABLE IF NOT EXISTS users_rooms_relation (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            main_room_id INT NOT NULL,
            breakout_room_id INT,
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (main_room_id) REFERENCES main_room(id),
            FOREIGN KEY (breakout_room_id) REFERENCES breakout_room(id)
          )
        `;
      connection.query(createTableQuery, (error, results) => {
        connection.release();
        if (error) return reject(error);
        console.log("users table created");
        resolve();
      });
    });
  });
}

function createUserGroupsTable() {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) return reject(err);
      const createTableQuery = `
          CREATE TABLE IF NOT EXISTS user_groups (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            breakout_room_id INT,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (breakout_room_id) REFERENCES breakout_room(id)
          )
        `;
      connection.query(createTableQuery, (error, results) => {
        connection.release();
        if (error) return reject(error);
        console.log("users groups table created");
        resolve();
      });
    });
  });
}

export {
  pool,
  createDatabase,
  useDatabase,
  createUserTable,
  createMainRoomTable,
  createBreakoutRoomTable,
  createUserRoomsRelationTable,
  createUserGroupsTable,
};
