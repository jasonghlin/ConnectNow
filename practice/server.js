import express from "express";
import http from "http";
// import https from "https";
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
import { v4 as uuidv4 } from "uuid";

dotenv.config();
const { JWT_SECRET_KEY, ENV } = process.env;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

EventEmitter.defaultMaxListeners = 100;

const saltRounds = 10;

const app = express();

// let options;
// if (ENV === "production") {
//   options = {
//     key: fs.readFileSync("/home/ubuntu/privkey.pem"),
//     cert: fs.readFileSync("/home/ubuntu/cert.pem"),
//   };
// }

let server;
if (ENV === "production") {
  // server = https.createServer(app);
  server = http.createServer(app);
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

// let peerServer;
// if (ENV === "production") {
//   peerServer = ExpressPeerServer(server, {
//     debug: true,
//     path: "/myapp",
//   });
// } else {
//   peerServer = ExpressPeerServer(server, {
//     debug: true,
//   });
// }

app.use(bodyParser.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

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
const rooms = new Map();
const userRooms = new Map();

io.on("connection", (socket) => {
  socket.on("join-room", async (roomId, peerId, userId) => {
    console.log(
      `Attempt to join: User ${userId} joining room ${roomId} with peer ${peerId}`
    );

    // 檢查 roomId、userId 和 peerId 是否有效
    if (!roomId || roomId === "null" || roomId === "undefined") {
      console.error("Invalid roomId:", roomId);
      socket.emit("join-error", "Invalid room ID");
      return;
    }
    if (!userId || userId === "null" || userId === "undefined") {
      console.error("Invalid userId:", userId);
      socket.emit("join-error", "Invalid user ID");
      return;
    }
    if (!peerId || peerId === "null" || peerId === "undefined") {
      console.error("Invalid peerId:", peerId);
      socket.emit("join-error", "Invalid peer ID");
      return;
    }

    socket.join(roomId);

    // 確保 rooms Map 中存在該房間，並添加或更新用戶
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    const roomUsers = rooms.get(roomId);

    // 如果用戶已存在，更新其 peerId
    if (roomUsers.has(userId)) {
      const existingUser = roomUsers.get(userId);
      existingUser.peerId = peerId;
      roomUsers.set(userId, existingUser);
      console.log(`Updated peerId for User ${userId} in room ${roomId}`);
    } else {
      // 否則添加新的用戶信息
      roomUsers.set(userId, { userId, peerId });
      console.log(`User ${userId} successfully joined room ${roomId}`);
    }

    userRooms.set(userId, roomId);

    console.log(
      `1Room ${roomId} users:`,
      [...roomUsers.values()].map((u) => `${u.userId} (${u.peerId})`)
    );

    // 通知房間其他用戶有新用戶加入
    socket.to(roomId).emit("user-connected", peerId, userId);

    if (!roomWhiteboardStates[roomId]) {
      roomWhiteboardStates[roomId] = [];
    }

    socket.on("send-message", ({ roomId, message, userName }) => {
      if (message && message.trim() !== "") {
        io.to(roomId).emit("receive-message", { message, userName });
      }
    });

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
      console.log("User disconnected:", userId);
      if (userRooms.has(userId)) {
        const roomId = userRooms.get(userId);
        if (rooms.has(roomId)) {
          const roomUsers = rooms.get(roomId);
          roomUsers.delete(userId);
          if (roomUsers.size === 0) {
            rooms.delete(roomId);
          }
        }
        userRooms.delete(userId);
      }
      socket.to(roomId).emit("user-disconnected", peerId, userId);
    });

    // 打印房間信息，用於調試
    console.log(
      `2Room ${roomId} users:`,
      [...roomUsers.values()].map((u) => u.userId)
    );
  });

  socket.on("timer-ended", () => {
    const roomId = [...socket.rooms][1]; // 獲取房間 ID
    console.log("Timer ended for room:", roomId);
    io.to(roomId).emit("reconnect-all");
  });

  // Add new event handlers for group functionality
  socket.on("create-group", (groupName, members) => {
    const groupId = uuidv4();
    const group = { id: groupId, name: groupName, members };
    rooms.set(groupId, new Set(members));
    members.forEach((memberId) => {
      const memberSocket = io.sockets.sockets.get(memberId);
      if (memberSocket) {
        memberSocket.join(groupId);
        userRooms.set(memberId, groupId);
      }
    });
    io.to(groupId).emit("group-created", group);
  });

  socket.on("leave-group", (userId, groupId) => {
    if (rooms.has(groupId)) {
      rooms.get(groupId).delete(userId);
      if (rooms.get(groupId).size === 0) {
        rooms.delete(groupId);
      }
    }
    userRooms.delete(userId);
    socket.leave(groupId);
    io.to(groupId).emit("user-left-group", userId);
  });

  // socket.on("return-to-main-room", (userId, mainRoomId) => {
  //   console.log("return to main room");
  //   const currentRoomId = userRooms.get(userId);
  //   if (currentRoomId && currentRoomId !== mainRoomId) {
  //     socket.leave(currentRoomId);
  //     if (rooms.has(currentRoomId)) {
  //       rooms.get(currentRoomId).delete(userId);
  //       if (rooms.get(currentRoomId).size === 0) {
  //         rooms.delete(currentRoomId);
  //       }
  //     }
  //   }
  //   socket.join(mainRoomId);
  //   userRooms.set(userId, mainRoomId);
  //   if (!rooms.has(mainRoomId)) {
  //     rooms.set(mainRoomId, new Set());
  //   }
  //   rooms.get(mainRoomId).add(userId);
  //   io.to(mainRoomId).emit("user-joined-main-room", userId);
  // });

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
              res.status(200).json({ token, username: user[0].name });
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

app.get("/api/allUsers", authenticateJWT, async (req, res) => {
  try {
    const url = req.headers.referer;
    if (!url) {
      console.error("Referer header is missing");
      return res.status(400).json({ error: "Unable to determine room ID" });
    }
    const urlParts = url.split("/");
    const roomId = urlParts[urlParts.length - 1];

    if (!roomId) {
      console.error("Unable to extract room ID from URL");
      return res.status(400).json({ error: "Unable to determine room ID" });
    }

    console.log("Fetching users for room:", roomId);
    const users = await getAllUsers(roomId);
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching all users:", error);
    if (error.message.includes("No main room found")) {
      res.status(404).json({ error: "Room not found" });
    } else {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});

// Add a new API endpoint to save groups
app.post("/api/save-groups", authenticateJWT, (req, res) => {
  const groups = req.body;
  // Here you would typically save the groups to a database
  // For this example, we'll just log them and send a success response
  console.log("Saved groups:", groups);
  res.status(200).json({ message: "Groups saved successfully" });
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

const port = ENV === "production" ? 8080 : 8080;

// Start the server
server.listen(port, "0.0.0.0", () => {
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
