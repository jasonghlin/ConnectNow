import express from "express";
import axios from "axios";
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
import socketAuth from "./sockets/auth.js";
import socketMainRoom from "./sockets/mainRoom.js";
import socketBreakoutRoom from "./sockets/breakoutRoom.js";
import socketMedia from "./sockets/media.js";
import socketPolling from "./sockets/polling.js";
import socketEmoji from "./sockets/emoji.js";
import socketChat from "./sockets/chat.js";
import socketWhiteboard from "./sockets/whiteboard.js";
import socketVideo from "./sockets/video.js";
import socketVideoRecord from "./sockets/videoRecord.js";

dotenv.config();
const { ENV, REDIS_URL, STATIC_FILE_URL, DOMAIN } = process.env;
let BASE_URL = STATIC_FILE_URL;

const port = 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workingDirectory = dirname(__dirname);

const app = express();

let server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [DOMAIN, "http://127.0.0.1:8080", BASE_URL],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "my-custom-header"],
    credentials: true,
    allowEIO3: true,
  },
});

let redisClient;
if (ENV === "production") {
  redisClient = createClient({
    url: REDIS_URL,
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
        url: REDIS_URL,
      }
    : { url: "redis://localhost:6379" }
);
const subClient = pubClient.duplicate();
await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));

app.use(bodyParser.json());
app.use(cookieParser());

app.use(
  cors({
    origin: [DOMAIN, "http://127.0.0.1:8080", BASE_URL],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "my-custom-header"],
    credentials: true,
  })
);

app.use(userRouter);
app.use(roomRouter);

// 其他路由
app.get("/", async (req, res) => {
  try {
    // 下載遠端檔案
    const fileUrl = `${BASE_URL}/static/routerRoom.html`;
    const response = await axios({
      method: "GET",
      url: fileUrl,
      responseType: "stream", // 使用stream來處理大檔案
    });

    // 設置正確的 Content-Type
    res.setHeader("Content-Type", response.headers["content-type"]);

    // 將下載的檔案流傳送給前端
    response.data.pipe(res);
  } catch (error) {
    res.status(500).send("Error downloading the file");
  }
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/member", authenticateJWT, async (req, res) => {
  try {
    // 下載遠端檔案
    const fileUrl = `${BASE_URL}/static/member.html`;
    const response = await axios({
      method: "GET",
      url: fileUrl,
      responseType: "stream", // 使用stream來處理大檔案
    });

    // 設置正確的 Content-Type
    res.setHeader("Content-Type", response.headers["content-type"]);

    // 將下載的檔案流傳送給前端
    response.data.pipe(res);
  } catch (error) {
    res.status(500).send("Error downloading the file");
  }
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

    try {
      // 下載遠端檔案
      const fileUrl = `${BASE_URL}/static/room.html`;
      const response = await axios({
        method: "GET",
        url: fileUrl,
        responseType: "stream", // 使用stream來處理大檔案
      });

      // 設置正確的 Content-Type
      res.setHeader("Content-Type", response.headers["content-type"]);

      // 將下載的檔案流傳送給前端
      response.data.pipe(res);
    } catch (error) {
      res.status(500).send("Error downloading the file");
    }

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
  console.log("A user connected:", socket.id);
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
  socketVideoRecord(io, socket);
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
