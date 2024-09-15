import dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";

const { MYSQL_USER, MYSQL_HOST, MYSQL_PASSWORD, ENV } = process.env;

let pool;

if (ENV === "production") {
  pool = mysql.createPool({
    connectionLimit: 10,
    host: MYSQL_HOST,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: "ConnectNow",
  });
} else {
  pool = mysql.createPool({
    connectionLimit: 10,
    host: "localhost",
    user: "root",
    password: MYSQL_PASSWORD,
    database: "ConnectNow",
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
          avatar_url VARCHAR(255)
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
            admin_user_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (admin_user_id) REFERENCES users(id)
          )
        `;
      connection.query(createTableQuery, (error, results) => {
        connection.release();
        if (error) return reject(error);
        console.log("main_room table created");
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
              name VARCHAR(255) UNIQUE NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `;
      connection.query(createTableQuery, (error, results) => {
        connection.release();
        if (error) return reject(error);
        console.log("breakout_room table created");
        resolve();
      });
    });
  });
}

function createUsersRoomsRelationTable() {
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
            admin_user_id INT,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (main_room_id) REFERENCES main_room(id),
            FOREIGN KEY (breakout_room_id) REFERENCES breakout_room(id),
            FOREIGN KEY (admin_user_id) REFERENCES users(id)
          )
        `;
      connection.query(createTableQuery, (error, results) => {
        connection.release();
        if (error) return reject(error);
        console.log("users_rooms_relation table created");
        resolve();
      });
    });
  });
}

function createRoomVideoSrtUrlTable() {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) return reject(err);
      const createTableQuery = `
          CREATE TABLE IF NOT EXISTS room_video_srt (
            id INT AUTO_INCREMENT PRIMARY KEY,
            admin_user_id INT NOT NULL,
            main_room_id INT NOT NULL,
            video_url VARCHAR(255) DEFAULT 'Pending',
            srt_url VARCHAR(255) DEFAULT 'Pending',
            start_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (admin_user_id) REFERENCES users(id),
            FOREIGN KEY (main_room_id) REFERENCES main_room(id)
          )
        `;
      connection.query(createTableQuery, (error, results) => {
        connection.release();
        if (error) return reject(error);
        console.log("users_rooms_relation table created");
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
  createUsersRoomsRelationTable,
  createRoomVideoSrtUrlTable,
};
