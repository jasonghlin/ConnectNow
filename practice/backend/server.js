import express from "express";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { createClient } from "redis";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./routers/userRouter.js";
import { checkUserInMainRoom } from "../models/checkUserInMainRoom.js";
import { authenticateJWT } from "../public/utils/authenticateJWT.js";
import { createMainRoom } from "../models/createMainRoom.js";
import { checkMainRoomExist } from "../models/checkMainRoomExist.js";
import { joinMainRoom } from "../models/joinMainRoom.js";

dotenv.config();
const { JWT_SECRET_KEY, ENV, AWS_ACCESS_KEY, AWS_SECRET_KEY, BUCKET_NAME } =
  process.env;
const port = 8080;

let redisClient;
if (ENV === "production") {
  redisClient = createClient({
    url: "rediss://clustercfg.connectnow-elasticache.z2mtgi.usw2.cache.amazonaws.com:6379",
  });
} else {
  redisClient = createClient();
}
redisClient.on("error", (err) => console.log("Redis Client Error", err));
await redisClient.connect();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workingDirectory = dirname(__dirname);

const app = express();

let server;
if (ENV === "production") {
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

app.use("/static", express.static(join(workingDirectory, "public")));

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
    allowEIO3: true,
  },
});

app.use(bodyParser.json());
app.use(cookieParser());

// 使用 userRouter
app.use(userRouter);

// 其他路由
app.get("/", (req, res) => {
  res.sendFile(join(workingDirectory, "public", "routerRoom.html"));
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/member", (req, res) => {
  res.sendFile(join(workingDirectory, "public", "member.html"));
});

// create and join main room
app.get("/roomId/:roomId", authenticateJWT, async (req, res) => {
  const { roomId: roomName } = req.params;
  console.log("join room: ", roomName);
  const roomExist = await checkMainRoomExist(roomName);
  console.log("roomExist: ", roomExist);
  if (!roomExist) {
    res.status(404).json({ error: "main room not found" });
  } else {
    const joinMainRoomSuccess = await joinMainRoom(req.payload, roomName);
    console.log("joinMainRoomSuccess: ", joinMainRoomSuccess);
    if (!joinMainRoomSuccess) {
      res.status(403).json({ error: "user already in room!" });
    } else {
      res.sendFile(join(workingDirectory, "public", "room.html"));
    }
  }
});

function generateRoomName() {
  const part1 = Math.random().toString(36).substring(2, 8);
  const part2 = Math.random().toString(36).substring(2, 8);
  return `${part1}-${part2}`;
}

app.post("/api/mainRoom", authenticateJWT, async (req, res) => {
  const roomName = generateRoomName();
  await createMainRoom(req.payload, roomName);
  res.status(200).json({ ok: true, roomId: roomName });
});

// sockets
const rooms = new Map();
const userRooms = new Map();
io.on("connection", (socket) => {
  socket.on("join-main-room", async (roomName, peerId, userId) => {
    try {
      console.log(
        `Attempt to join: User ${userId} joining room ${roomName} with peerId ${peerId}`
      );

      // 檢查 roomName、userId 和 peerId 是否有效
      if (!roomName || roomName === "null" || roomName === "undefined") {
        console.error("Invalid roomName:", roomName);
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

      socket.join(roomName);

      // 確保 rooms Map 中存在該房間，並添加或更新用戶
      if (!rooms.has(roomName)) {
        rooms.set(roomName, new Map());
      }
      const roomUsers = rooms.get(roomName);

      // 如果用戶已存在，更新其 peerId
      if (roomUsers.has(userId)) {
        let existingUser = roomUsers.get(userId);
        existingUser = { ...existingUser, userId, peerId }; // 確保 userId 屬性存在於 existingUser 中
        console.log("roomUsers set:", userId, existingUser);
        roomUsers.set(userId, existingUser);
        console.log(`Updated peerId for User ${userId} in room ${roomName}`);
      } else {
        // 否則添加新的用戶信息
        roomUsers.set(userId, { userId, peerId });
        console.log(`User ${userId} successfully joined room ${roomName}`);
      }

      userRooms.set(userId, roomName);

      console.log(
        `1Room ${roomName} users:`,
        [...roomUsers.values()].map((u) => `${u.userId} (${u.peerId})`)
      );
      console.log("userRooms: ", userRooms);

      // 通知房間其他用戶有新用戶加入
      //   socket.to(roomName).emit("user-connected-mainRoom", peerId, userId);
      roomUsers.forEach((user) => {
        console.log("user: ", user);
        socket.to(roomName).emit("user-connected-mainRoom", peerId, userId);
      });
    } catch (error) {
      console.log(error);
    }
  });
});

//
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
