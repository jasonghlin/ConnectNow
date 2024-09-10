import express from "express";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./routers/userRouter.js";
import roomRouter from "./routers/roomRouter.js";
import jwt from "jsonwebtoken";
import { authenticateJWT } from "./utils/authenticateJWT.js";
import { checkMainRoomExist } from "../models/checkMainRoomExist.js";
import { adminJoinMainRoom } from "../models/adminJoinMainRoom.js";
import { findMainRoomAdmin } from "../models/findMainRoomAdmin.js";
import socketAuth from "./sockets/socketAuth.js";
import socketMainRoom from "./sockets/socketMainRoom.js";
import socketBreakoutRoom from "./sockets/socketBreakoutRoom.js";
import socketMedia from "./sockets/socketMedia.js";
import socketPolling from "./sockets/socketPolling.js";
import socketEmoji from "./sockets/socketEmoji.js";
import socketChat from "./sockets/socketChat.js";
import socketWhiteboard from "./sockets/socketWhiteboard.js";
import socketVideo from "./sockets/socketVideo.js";

dotenv.config();
const { ENV } = process.env;

const port = 8080;

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

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
    allowEIO3: true,
  },
});

let redisClient;
if (ENV === "production") {
  redisClient = createClient({
    url: "rediss://clustercfg.connectnow-redis-server.z2mtgi.usw2.cache.amazonaws.com:6379",
  });
} else {
  redisClient = createClient();
}
redisClient.on("error", (err) => console.log("Redis Client Error", err));
await redisClient.connect();

// 設定 redis adaptor
const pubClient = createClient(
  ENV === "production"
    ? {
        url: "rediss://clustercfg.connectnow-redis-server.z2mtgi.usw2.cache.amazonaws.com:6379",
      }
    : { url: "redis://localhost:6379" }
);
const subClient = pubClient.duplicate();
await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));

app.use(bodyParser.json());
app.use(cookieParser());

// 使用 userRouter

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  })
);

app.use("/static", express.static(join(workingDirectory, "public")));
app.use(userRouter);
app.use(roomRouter);

// 其他路由
app.get("/", (req, res) => {
  res.sendFile(join(workingDirectory, "public", "routerRoom.html"));
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/member", authenticateJWT, (req, res) => {
  res.sendFile(join(workingDirectory, "public", "member.html"));
});

// create and join main room
app.get("/roomId/:roomId", authenticateJWT, async (req, res) => {
  const { roomId: roomName } = req.params;
  console.log("join room: ", roomName);
  const roomExist = await checkMainRoomExist(roomName);
  console.log("roomExist: ", roomExist);
  if (!roomExist) {
    res.redirect("/");
  } else {
    const roomAdminId = await findMainRoomAdmin(roomName);
    if (roomAdminId.length === 0) {
      await adminJoinMainRoom(req.payload, roomName);
    }

    res.sendFile(join(workingDirectory, "public", "room.html"));

    // if (!joinMainRoomSuccess) {
    //   res.status(403).json({ error: "user already in room!" });
    // } else {
    //   res.sendFile(join(workingDirectory, "public", "room.html"));
    // }
  }
});

app.use((req, res, next) => {
  if (req.path === "/") {
    return next(); // 避免對首頁的進一步處理，避免迴圈
  }
  res.redirect("/");
});
// sockets

io.use(socketAuth(io, jwt));

io.on("connection", (socket) => {
  socket.on("connect-to-server", (userId, mainRoom) => {
    if (userId && mainRoom) {
      socket.data.roomName = mainRoom;
      socket.data.userId = userId;
    }
  });

  socketMainRoom(io, socket, redisClient);
  socketBreakoutRoom(io, socket);
  socketMedia(io, socket);
  socketPolling(io, socket);
  socketEmoji(io, socket);
  socketChat(io, socket, redisClient);
  socketWhiteboard(io, socket, redisClient);
  socketVideo(io, socket);
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
