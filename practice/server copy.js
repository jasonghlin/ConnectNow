import express from "express";
import http from "http";
import { Server } from "socket.io";
import { ExpressPeerServer } from "peer";
import cors from "cors";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import { createUser } from "./models/createUser.js";
import { EventEmitter } from "events";
import { get_user } from "./models/registerAndLogin.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { authenticateJWT } from "./utils/util.js";
import { insertRoomInfo, joinRoom } from "./models/createAndJoinMainRoom.js";

dotenv.config();
const { JWT_SECRET_KEY } = process.env;

// 获取当前文件的路径和目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

EventEmitter.defaultMaxListeners = 100;

const saltRounds = 10;

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:8000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  })
);

app.use("/static", express.static(join(__dirname, "public")));

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

const peerServer = ExpressPeerServer(server, {
  debug: true,
});

app.use("/peerjs", peerServer);
app.use(bodyParser.json());

app.get("/js/loginOutAndRegister.js", (req, res) => {
  res.sendFile(join(__dirname, "utils", "loginOutAndRegister.js"));
});

app.get("/utils/loginOutAndRegister", (req, res) => {
  res.sendFile(join(__dirname, "utils", "loginOutAndRegister.js"));
});

let room;
app.get("/roomId/:id", (req, res) => {
  res.sendFile(join(__dirname, "public", "room.html"));
});

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "public", "routerRoom.html"));
});

app.get("/roomIdServer/:roomId", (req, res) => {
  room = findRoom(req.params.roomId);
  res.json(room[req.params.roomId] || {});
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId) => {
    console.log(`${userId} joined ${roomId}`);
    if (!room[roomId]) {
      room[roomId] = [];
    }
    room[roomId].push(userId);
    socket.join(roomId);
    socket.to(roomId).emit("user-connected", userId);

    socket.on("disconnect", () => {
      socket.to(roomId).emit("user-disconnected", userId);
      room[roomId] = room[roomId].filter((id) => id !== userId);
    });
  });
});

function generateRoomId() {
  const part1 = Math.random().toString(36).substring(2, 8);
  const part2 = Math.random().toString(36).substring(2, 8);
  return `${part1}-${part2}`;
}

app.get("/api/roomId", (req, res) => {
  const roomId = generateRoomId();
  return res.json(roomId);
});

async function hashPassword(password) {
  try {
    const hash_password = await bcrypt.hash(password, saltRounds);
    console.log("Hashed password:", hash_password);
    return hash_password;
  } catch (err) {
    console.error("Error hashing password:", err);
    throw err;
  }
}

app.post("/api/user", async (req, res) => {
  try {
    const userExist = get_user(req.body);
    if (userExist.length === 0) {
      const hash_password = await hashPassword(req.body.password);
      const userId = await createUser(
        req.body.name,
        req.body.email,
        hash_password
      );
      res.status(201).json({ message: "User registered successfully", userId });
    } else {
      res.status(400).json({ message: "此 email 已註冊過" });
    }
  } catch (error) {
    console.error("Error registering user:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

async function createAccessToken(userId, userName, userEmail, expire) {
  const payload = {
    userId,
    userName,
    userEmail,
  };
  const options = {
    expiresIn: "7d",
  };

  return new Promise((resolve, reject) => {
    jwt.sign(payload, JWT_SECRET_KEY, options, (err, token) => {
      if (err) {
        reject(err);
      } else {
        resolve(token);
      }
    });
  });
}

app.put("/api/user/auth", async (req, res) => {
  try {
    const user = await get_user(req.body);
    if (user.length > 0) {
      bcrypt.compare(
        req.body.password,
        user[0].password_hash,
        async (error, result) => {
          if (error) {
            console.error("Error comparing passwords:", error);
            res
              .status(500)
              .json({ error: "Internal Server Error", details: error.message });
          } else if (result) {
            try {
              const token = await createAccessToken(
                user[0].id,
                user[0].name,
                user[0].email
              );
              res.status(200).json({ token });
            } catch (tokenError) {
              console.error("Error creating token:", tokenError);
              res.status(500).json({
                error: "Internal Server Error",
                details: tokenError.message,
              });
            }
          } else {
            res
              .status(401)
              .json({ error: "Unauthorized", details: "密碼錯誤" });
          }
        }
      );
    } else {
      res
        .status(401)
        .json({ error: "Unauthorized", details: "登入失敗，帳號或密碼錯誤" });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

app.get("/api/user/auth", authenticateJWT, (req, res) => {
  res.json({ message: "Authenticated", payload: req.payload });
});

app.post("/api/createMainRoom", authenticateJWT, async (req, res) => {
  await insertRoomInfo(req.payload, req.body.roomId);
  res.status(200).json({ ok: true });
});

server.listen(8080, () => {
  console.log("Server is running on port 8080");
});
