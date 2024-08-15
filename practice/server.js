import express from "express";
import http from "http";
// import https from "https";
import { Server } from "socket.io";
import cors from "cors";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import { createUser } from "./models/createUser.js";
import { EventEmitter } from "events";
import { get_user } from "./models/registerAndLogin.js";
import { saveGroups } from "./models/createUserGroups.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { authenticateJWT } from "./public/utils/util.js";
import {
  insertRoomInfo,
  findRoom,
  joinRoomInfo,
} from "./models/createAndJoinMainRoom.js";
import { getAllUsers } from "./models/getAllUsers.js";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import {
  updateUserName,
  updateUserEmail,
  updateUserPassword,
  updateDbUserImg,
  getDbUserImg,
} from "./models/updateUserInfo.js";
import {
  deleteUserInUserGroups,
  deleteUserInUsersRoomsRelation,
  deleteUserInMainRoom,
  deleteUser,
} from "./models/deleteUsersFromMainRoom.js";
import {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import multer from "multer";
import { convertToMovStream } from "./public/utils/converToMOV.js";
import { checkIsAdmin } from "./models/checkIsAdmin.js";

import { createClient } from "redis";
const redisClient = createClient();

redisClient.on("error", (err) => console.log("Redis Client Error", err));

await redisClient.connect();

dotenv.config();
const { JWT_SECRET_KEY, ENV, AWS_ACCESS_KEY, AWS_SECRET_KEY, BUCKET_NAME } =
  process.env;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const s3Client = new S3Client({
  region: "us-west-2", // 替换为你实际的区域
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY,
  },
});

EventEmitter.defaultMaxListeners = 100;

const saltRounds = 10;
const upload = multer();
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

app.get("/roomId/:id", (req, res) => {
  res.sendFile(join(__dirname, "public", "room.html"));
});

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "public", "routerRoom.html"));
});

app.get("/member", (req, res) => {
  res.sendFile(join(__dirname, "public", "member.html"));
});

app.get("/roomIdServer/:roomId", async (req, res) => {
  const roomJoinName = await findRoom(req.params.roomId);
  res.json(roomJoinName[0]?.name || {});
});

const roomWhiteboardStates = {};
const rooms = new Map();
const userRooms = new Map();
// 新增投票邏輯
const polls = {};

let roomAdmins = new Map();
const pendingUsers = new Map();

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  socket.on("send-message", async ({ roomId, message, userName }) => {
    if (message && message.trim() !== "") {
      const chatMessage = { userName, message };

      // Save the message in Redis
      await redisClient.rPush(`chat:${roomId}`, JSON.stringify(chatMessage));

      // Emit the message to all users in the room
      io.to(roomId).emit("receive-message", chatMessage);
    }
  });

  // Load messages for a specific room
  socket.on("load-chat", async (roomId, callback) => {
    const messages = await redisClient.lRange(`chat:${roomId}`, 0, -1);
    const parsedMessages = messages.map((msg) => JSON.parse(msg));
    callback(parsedMessages);
  });

  // // Handle room switch (e.g., moving to a breakout room)
  // socket.on("join-room", async (roomId, peerId, userId) => {
  //   // Switch room logic...
  //   socket.join(roomId);

  //   // Notify the user to load the new chat
  //   socket.emit("switch-room", roomId);
  // });

  socket.on("join-room", async (roomId, peerId, userId) => {
    console.log(
      `Attempt to join: User ${userId} joining room ${roomId} with peer ${peerId}`
    );
    const isBreakoutRoom = roomId.startsWith("breakout-");
    socket.userId = userId; // 将 userId 绑定到 socket 对象
    if (!isBreakoutRoom) {
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
        roomAdmins.set(roomId, userId); // Set the first user as admin
        socket.emit("admin-status", true);
        rooms.get(roomId).set(userId, { peerId }); // Add admin to room
        socket.join(roomId);
      } else {
        const isAdmin = roomAdmins.get(roomId) === userId;
        socket.emit("admin-status", isAdmin);

        if (!isAdmin) {
          pendingUsers.set(socket.id, { userId, peerId, roomId });

          const adminSocketId = [...io.sockets.sockets].find(([id, sock]) => {
            return sock.userId === roomAdmins.get(roomId);
          })?.[0];

          if (adminSocketId) {
            const users = await getAllUsers(roomId);
            if (users.some((user) => user.id === userId)) {
              socket.join(roomId);
              socket.emit("join-approved", roomId);
              io.to(roomId).emit("user-connected", peerId, userId);
              return;
            }
            io.to(adminSocketId).emit("user-join-request", {
              socketId: socket.id,
              userId,
              peerId,
              roomId,
            });
          } else {
            socket.emit("join-rejected");
          }
        } else {
          const roomUsers = rooms.get(roomId);

          if (roomUsers.has(userId)) {
            const existingUser = roomUsers.get(userId);
            existingUser.peerId = peerId;
          } else {
            roomUsers.set(userId, { peerId });
          }

          socket.join(roomId);
          io.to(roomId).emit("user-connected", peerId, userId);
        }
      }
    } else {
      // For breakout rooms, simply add the user to the room without admin checks
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }

      const roomUsers = rooms.get(roomId);
      roomUsers.set(userId, { peerId });
      socket.join(roomId);
      io.to(roomId).emit("user-connected", peerId, userId);
      // Notify the user to load the new chat
      socket.emit("switch-room", roomId);
    }

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
      let existingUser = roomUsers.get(userId);
      existingUser = { ...existingUser, peerId, userId }; // 確保 userId 屬性存在於 existingUser 中
      console.log("roomUsers set:", userId, existingUser);
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

    socket.on("update-stream", (userId, streamId, isScreenShare) => {
      io.to(roomId).emit("update-stream", userId, streamId, isScreenShare);
    });

    // 通知房間其他用戶有新用戶加入
    socket.to(roomId).emit("user-connected", peerId, userId);

    if (!roomWhiteboardStates[roomId]) {
      roomWhiteboardStates[roomId] = [];
    }

    socket.on("user-hangout", (peerId) => {
      const roomId = [...socket.rooms][1]; // 獲取房間 ID
      if (roomId) {
        // 廣播給同房間的其他成員，關閉該使用者的影像
        socket.to(roomId).emit("close-user-video", peerId);
      }
    });

    // timer
    socket.on("start-countdown", (timerInputValue) => {
      console.log("Starting countdown");
      const roomId = [...socket.rooms][1]; // 获取房间 ID
      console.log(
        `Starting countdown for room ${roomId} with ${timerInputValue} seconds`
      );
      io.to(roomId).emit("start-countdown", timerInputValue);
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

    socket.on("disconnect", async () => {
      try {
        console.log("User disconnected:", userId);
        const isBreakoutRoom = roomId.startsWith("breakout-");
        if (!isBreakoutRoom) {
          await deleteUserInUserGroups();
          await deleteUserInUsersRoomsRelation(userId);
          await deleteUserInMainRoom(userId);
          await deleteUser(userId);
        }
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
      } catch (err) {
        console.log(err);
      }
    });

    // 打印房間信息，用於調試
    console.log(
      `2Room ${roomId} users:`,
      [...roomUsers.values()].map((u) => u.userId)
    );
  });

  socket.on("admin-approve-user", ({ socketId }) => {
    const pendingUser = pendingUsers.get(socketId);
    if (pendingUser) {
      const { userId, peerId, roomId } = pendingUser;
      rooms.get(roomId).set(userId, { peerId }); // 将用户加入房间
      const userSocket = io.sockets.sockets.get(socketId);
      if (userSocket) {
        userSocket.join(roomId);
        io.to(userSocket.id).emit("join-approved", roomId);
        io.to(roomId).emit("user-connected", peerId, userId);
        pendingUsers.delete(socketId); // 確保每個請求只處理一次
      }
    }
  });

  socket.on("admin-reject-user", ({ socketId }) => {
    const userSocket = io.sockets.sockets.get(socketId);
    if (userSocket) {
      io.to(userSocket.id).emit("join-rejected");
      userSocket.disconnect(true);
      pendingUsers.delete(socketId); // 確保每個請求只處理一次
    }
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

  // 投票系統
  socket.on("start-poll", ({ question, options }) => {
    const roomId = [...socket.rooms][1]; // Get room ID
    console.log(`start-poll: ${roomId}`, { question, options });
    if (!roomId) return;

    polls[roomId] = { question, options, votes: {} };
    io.to(roomId).emit("show-poll", { question, options });
  });

  socket.on("end-poll", () => {
    const roomId = [...socket.rooms][1]; // Get room ID
    console.log(`end-poll: ${roomId}`);
    if (!roomId) return;

    const poll = polls[roomId];
    if (poll) {
      const results = calculateResults(poll);
      io.to(roomId).emit("show-results", results);
      delete polls[roomId];
    }
  });

  socket.on("vote", (option) => {
    const roomId = [...socket.rooms][1]; // Get room ID
    console.log(`vote-poll: ${roomId}`, option);
    if (!roomId) return;

    const poll = polls[roomId];
    if (poll) {
      poll.votes[socket.id] = option;
      const results = calculateResults(poll);
      io.to(roomId).emit("update-results", results);
    }
  });

  socket.on("request-results", () => {
    const roomId = [...socket.rooms][1]; // Get room ID
    console.log(`request-results: ${roomId}`);
    if (!roomId) return;

    const poll = polls[roomId];
    if (poll) {
      const results = calculateResults(poll);
      socket.emit("show-results", results);
    }
  });

  function calculateResults(poll) {
    const totalVotes = Object.values(poll.votes).length;
    return poll.options.map((option) => {
      const voteCount = Object.values(poll.votes).filter(
        (vote) => vote === option
      ).length;
      const percentage = totalVotes
        ? Math.round((voteCount / totalVotes) * 100)
        : 0;
      return { option, percentage };
    });
  }
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

app.post("/api/user/userInfo", authenticateJWT, async (req, res) => {
  console.log(req.body);
  console.log(req.payload);
  try {
    if (req.body.name) {
      const result = await updateUserName(req.body.name, req.payload.userId);

      if (result) {
        const token = await createAccessToken(
          req.payload.userId,
          req.body.name,
          req.payload.userEmail
        );

        res.status(200).json({ token, username: req.body.name });
      }
    } else if (req.body.email) {
      const userExist = await get_user(req.body);
      console.log(userExist.length);
      if (userExist.length > 0) {
        res.status(400).json({ error: true, message: "此 email 已註冊過" });
      } else {
        const result = await updateUserEmail(
          req.body.email,
          req.payload.userId
        );

        if (result) {
          const token = await createAccessToken(
            req.payload.userId,
            req.payload.userName,
            req.body.email
          );

          res.status(200).json({ token });
        }
      }
    } else if (req.body.password) {
      const hash_password = await hashPassword(req.body.password);
      const result = updateUserPassword(hash_password, req.payload.userId);
      console.log(result);
      if (result) {
        res.status(200).json({ ok: true });
      }
    }
  } catch (err) {
    console.log(err);
  }
});

// create main room
app.post("/api/mainRoom", authenticateJWT, async (req, res) => {
  await insertRoomInfo(req.payload, req.body.roomId);
  res.status(200).json({ ok: true });
});

// join main room
app.post("/api/mainRoom/:roomId", authenticateJWT, async (req, res) => {
  const { roomId } = req.params;
  await joinRoomInfo(req.payload, roomId);
  res.status(200).json({ ok: true });
});

// check if user is admin
app.post("/api/admin", authenticateJWT, async (req, res) => {
  const isAdmin = await checkIsAdmin(req.body.roomId, req.payload.userId);
  if (isAdmin.length > 0) {
    res.status(200).json({ admin: true });
  } else {
    res.status(403).json({ admin: false });
  }
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
app.post("/api/groups", authenticateJWT, async (req, res) => {
  try {
    const groups = req.body;
    const result = await saveGroups(groups);
    console.log("Saved groups:", groups);

    // 通知所有客戶端
    io.emit("groups-finished", result);

    res
      .status(200)
      .json({ message: "Groups saved successfully", data: result });
  } catch (error) {
    console.error("Error saving groups:", error);
    res
      .status(500)
      .json({ message: "Error saving groups", error: error.message });
  }
});

app.get("/api/userImg", authenticateJWT, async (req, res) => {
  const result = await getDbUserImg(req.payload.userId);

  if (result) {
    return res.json({ message: "File found successfully", url: result.url });
  }

  return res.status(404).json({ message: "File not found" });
});

app.post(
  "/api/userImg",
  authenticateJWT,
  upload.single("file"),
  async (req, res) => {
    const file = req.file;

    if (!file || !["image/jpeg", "image/png"].includes(file.mimetype)) {
      return res.status(400).json({ message: "Invalid file type" });
    }

    const fileKey = `user-${req.payload.userId}-${file.originalname}`;

    try {
      // Upload file to S3
      const uploadParams = {
        Bucket: BUCKET_NAME,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      };
      await s3Client.send(new PutObjectCommand(uploadParams));

      // Get file URL
      const fileUrl = `https://d3u8ez3u55dl9n.cloudfront.net/${fileKey}`;
      await updateDbUserImg(req.payload.userId, fileUrl);

      return res.json({ message: "File uploaded successfully", url: fileUrl });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ message: "File upload failed", error: err.message });
    }
  }
);

const uploadVideo = multer({ storage: multer.memoryStorage() }); // Use memory storage to avoid saving to disk

app.post("/video-record", uploadVideo.single("recording"), (req, res) => {
  convertToMovStream(req.file.buffer, (err, movStream) => {
    if (err) {
      return res.status(500).send("Error converting file.");
    }

    res.setHeader("Content-Type", "video/quicktime");

    movStream.on("end", () => {
      console.log("MOV stream sent successfully.");
    });

    movStream.on("error", (error) => {
      console.error("Stream error:", error);
      if (!res.headersSent) {
        res.status(500).send("Error streaming MOV file.");
      }
    });

    movStream.pipe(res);
  });
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
