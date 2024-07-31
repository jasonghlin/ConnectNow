import express from "express";
import http from "http";
import https from "https";
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
import {
  insertRoomInfo,
  findRoom,
  findAllRooms,
  joinRoomInfo,
} from "./models/createAndJoinMainRoom.js";
import { getAllUsers } from "./models/getAllUsers.js";
import fs from "fs";

dotenv.config();
const { JWT_SECRET_KEY, ENV } = process.env;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

EventEmitter.defaultMaxListeners = 100;

const saltRounds = 10;

const app = express();

let options;
if (ENV === "production") {
  options = {
    key: fs.readFileSync("/home/ubuntu/privkey.pem"),
    cert: fs.readFileSync("/home/ubuntu/fullchain.pem"),
    ca: fs.readFileSync("/home/ubuntu/chain.pem"),
  };
}

let server;
if (ENV === "production") {
  server = https.createServer(options, app);
} else {
  server = http.createServer(app);
}

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  })
);

app.use("/static", express.static(join(__dirname, "public")));

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
    allowEIO3: true,
  },
});

const peerServer = ExpressPeerServer(server, {
  debug: true,
});

app.use(bodyParser.json());

app.get("/utils/loginOutAndRegister.js", (req, res) => {
  res.sendFile(join(__dirname, "utils", "loginOutAndRegister.js"));
});

app.get("/utils/videoLayout.js", (req, res) => {
  res.sendFile(join(__dirname, "utils", "videoLayout.js"));
});

let room;
app.get("/roomId/:id", (req, res) => {
  res.sendFile(join(__dirname, "public", "room.html"));
});

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "public", "routerRoom.html"));
});

app.get("/roomIdServer/:roomId", async (req, res) => {
  const roomJoinName = await findRoom(req.params.roomId);
  res.json(roomJoinName[0]?.name || {});
});

const roomWhiteboardStates = {};

io.on("connection", (socket) => {
  socket.on("join-room", async (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-connected", userId);

    if (!roomWhiteboardStates[roomId]) {
      roomWhiteboardStates[roomId] = [];
    }

    socket.emit("current-whiteboard-state", roomWhiteboardStates[roomId]);

    socket.on("draw", (data) => {
      roomWhiteboardStates[roomId].push(data);
      socket.to(roomId).emit("draw", data);
    });

    socket.on("clear-whiteboard", () => {
      roomWhiteboardStates[roomId] = [];
      socket.to(roomId).emit("clear-whiteboard");
    });

    socket.on("update-stream", (streamId, isScreenShare) => {
      io.to(roomId).emit("update-stream", streamId, isScreenShare);
    });

    socket.on("disconnect", () => {
      socket.to(roomId).emit("user-disconnected", userId);
    });
  });

  socket.on("request-whiteboard-state", (roomId) => {
    if (roomWhiteboardStates[roomId]) {
      socket.emit("current-whiteboard-state", roomWhiteboardStates[roomId]);
    }
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
    const userExist = await get_user(req.body);
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

app.post("/api/joinMainRoom", authenticateJWT, async (req, res) => {
  await joinRoomInfo(req.payload, req.body.roomId);
  res.status(200).json({ ok: true });
});

// 分房間

app.get("/api/allUsers", authenticateJWT, async (req, res) => {
  const url = req.headers.referer.split("/");
  const roomId = url[url.length - 1];
  const users = await getAllUsers(roomId);
  res.status(200).json(users);
});

// Ensure proper shutdown of the server
const shutdownServer = () => {
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Forcefully shutting down");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", shutdownServer);
process.on("SIGINT", shutdownServer);

const port = ENV === "production" ? 443 : 8080;

// Start the server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  if (ENV === "production") {
    http
      .createServer((req, res) => {
        res.writeHead(301, {
          Location: "https://" + req.headers.host + req.url,
        });
        res.end();
      })
      .listen(80);
  }
});
