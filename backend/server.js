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
import multer from "multer";
import jwt from "jsonwebtoken";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { checkUserInMainRoom } from "../models/checkUserInMainRoom.js";
import { authenticateJWT } from "../public/utils/authenticateJWT.js";
import { createMainRoom } from "../models/createMainRoom.js";
import { checkMainRoomExist } from "../models/checkMainRoomExist.js";
import { joinMainRoom } from "../models/joinMainRoom.js";
import { removeUserFromMainRoom } from "../models/removeUserFromMainRoom.js";
import { createBreakoutRoom } from "../models/createBreakoutRoom.js";
import { joinBreakoutRoom } from "../models/joinBreakoutRoom.js";
import { findMainRoomAdmin } from "../models/findMainRoomAdmin.js";
import { adminJoinMainRoom } from "../models/adminJoinMainRoom.js";
import { convertToMovStream } from "../public/utils/converToMOV.js";
import { getAllUsers } from "../models/getAllUsers.js";
import { updateMainRoomAdmin } from "../models/updateMainRoomAdmin.js";
import { createRoomVideoSrtUrl } from "../models/createRoomVideoSrtUrl.js";
import { updateRoomSrtUrl } from "../models/updateRoomSrtUrl.js";
import { updateRoomConvertedVideoUrl } from "../models/updateRoomConvertedVideoUrl.js";
import { getRoomVideoRecords } from "../models/getRoomVideoRecords.js";

dotenv.config();
const {
  JWT_SECRET_KEY,
  ENV,
  AWS_ACCESS_KEY,
  AWS_SECRET_KEY,
  BUCKET_NAME,
  SQS_URL,
} = process.env;
const port = 8080;

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workingDirectory = dirname(__dirname);

const app = express();

const s3Client = new S3Client({
  region: "us-west-2",
  credentials: { accessKeyId: AWS_ACCESS_KEY, secretAccessKey: AWS_SECRET_KEY },
});

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
app.use(userRouter);

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

// join breakout room
app.get(
  "/breakoutRoom/:mainRoomId/:breakoutRoomId",
  authenticateJWT,
  async (req, res) => {
    try {
      const { mainRoomId, breakoutRoomId } = req.params;
      console.log("join breakout room: ", breakoutRoomId);
      // create breakoutRoom
      const breakoutRoomCreation = await createBreakoutRoom(breakoutRoomId);
      console.log("breakoutRoomCreation: ", breakoutRoomCreation);
      console.log("breakout room: ", breakoutRoomId, "created");
      const joinBreakOutRoomSuccess = await joinBreakoutRoom(
        req.payload,
        mainRoomId,
        breakoutRoomId
      );
      console.log("joinBreakoutRoomSuccess: ", joinBreakOutRoomSuccess);
      res.sendFile(join(workingDirectory, "public", "room.html"));
    } catch (error) {
      console.log(error);
    }
  }
);

app.get("/api/muteStatus/:roomId", authenticateJWT, (req, res) => {
  const { roomId: roomName } = req.params;
  const muteStatus = userMuteStatus[roomName] || {};
  res.json(muteStatus);
});

app.get("/api/roomAdmin/:roomId", authenticateJWT, async (req, res) => {
  const { roomId: roomName } = req.params;
  const roomAdminId = await findMainRoomAdmin(roomName);
  res.json(roomAdminId);
});

app.get("/api/roomVideoRecords", authenticateJWT, async (req, res) => {
  const videoRecords = await getRoomVideoRecords(req.payload.userId);
  console.log("videoRecords: ", videoRecords);
  res.json(videoRecords);
});
// const uploadVideo = multer({ storage: multer.memoryStorage() }); // Use memory storage to avoid saving to disk

app.get("/generate-presigned-url", authenticateJWT, async (req, res) => {
  const { fileName, fileType } = req.query;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `videoRecord/raw-videos/${fileName}`,
    ContentType: fileType,
    ACL: "private",
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 60 });
  res.json({ url });
});

const sqsClient = new SQSClient({
  region: "us-west-2",
  credentials: { accessKeyId: AWS_ACCESS_KEY, secretAccessKey: AWS_SECRET_KEY },
});

app.post("/upload-complete", authenticateJWT, async (req, res) => {
  const { fileName, roomId: roomName } = req.body;

  const sqsParams = {
    QueueUrl: SQS_URL,
    MessageBody: JSON.stringify({
      s3Key: `videoRecord/raw-videos/${fileName}`,
      s3Bucket: BUCKET_NAME,
    }),
    MessageGroupId: "default",
  };

  try {
    const roomSrtresult = await createRoomVideoSrtUrl(
      roomName,
      req.payload.userId
    );
    const data = await sqsClient.send(new SendMessageCommand(sqsParams));
    res
      .status(200)
      .json({ message: "File uploaded and task added to SQS", data });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Error sending message to SQS", details: error });
  }
});

// app.post("/videoRecord", uploadVideo.single("recording"), (req, res) => {});

app.use((req, res, next) => {
  if (req.path === "/") {
    return next(); // 避免對首頁的進一步處理，避免迴圈
  }
  res.redirect("/");
});
// sockets

io.use((socket, next) => {
  // 从客户端的认证数据中获取 token，通常是通过 auth 传递
  const token = socket.handshake.auth.token;

  if (!token) {
    const err = new Error("Authentication error: No token provided");
    err.data = { content: "Please provide a valid token" }; // 对错误添加额外数据
    return next(err);
  }

  jwt.verify(token, JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      const authError = new Error("Authentication error: Invalid token");
      authError.data = { content: "Please provide a valid token" };
      return next(authError);
    }

    // 如果验证成功，可以将用户信息附加到 socket 对象上，供后续使用
    socket.user = decoded;
    console.log("socket.user: ", socket.user);
    next(); // 验证成功，继续连接
  });
});

const rooms = new Map();
const userMuteStatus = {}; // 儲存每個房間中使用者的靜音狀態，键为 roomId, 值为包含用户静音状态的对象
const polls = {};
// const roomWhiteboardStates = {};
io.on("connection", (socket) => {
  socket.on("connect-to-server", (userId, mainRoom) => {
    if (userId && mainRoom) {
      socket.data.roomName = mainRoom;
      socket.data.userId = userId;
    }
  });

  socket.on("join-main-room", async (roomName, peerId, userId) => {
    try {
      console.log(
        `Attempt to join: User ${userId} joining room ${roomName} with peerId ${peerId}`
      );

      // 檢查 roomName、userId 和 peerId 是否有效
      if (!roomName || !userId || !peerId) {
        console.error("Invalid roomName, userId, or peerId");
        socket.emit("join-error", "Invalid room or user data");
        return;
      }

      const roomAdminId = await findMainRoomAdmin(roomName);
      console.log("roomAdminId", roomAdminId);
      const joinMainRoomSuccess = await joinMainRoom(
        userId,
        roomName,
        roomAdminId[0].admin_user_id
      );
      console.log("joinMainRoomSuccess: ", joinMainRoomSuccess);
      // 儲存房間和使用者信息
      console.log(
        "Received roomName:",
        roomName,
        "userId:",
        userId,
        "peerId:",
        peerId
      );
      // socket.data.roomName = roomName;
      // socket.data.userId = userId;
      socket.data.peerId = peerId;

      console.log("Data stored in socket:", socket.data);
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

      console.log(
        `1Room ${roomName} users:`,
        [...roomUsers.values()].map((u) => `${u.userId} (${u.peerId})`)
      );

      // 通知房間其他用戶有新用戶加入
      //   socket.to(roomName).emit("user-connected-mainRoom", peerId, userId);
      roomUsers.forEach((user) => {
        console.log("user: ", user);
        socket.to(roomName).emit("user-connected-mainRoom", peerId, userId);
      });

      // send white board state
      // 从 Redis 获取当前房间的白板状态
      const whiteboardState = await redisClient.lRange(
        `whiteboard:${roomName}`,
        0,
        -1
      );

      // 将状态数据从字符串解析为对象数组
      const parsedState = whiteboardState.map((line) => JSON.parse(line));

      // 发送当前的白板状态给客户端
      socket.emit("current-whiteboard-state", parsedState);
    } catch (error) {
      console.log(error);
    }
  });

  socket.on("join-breakout-room", (breakouRoomName, peerId, userId) => {
    try {
      console.log(
        `Attempt to join: User ${userId} joining breakout room ${breakouRoomName} with peerId ${peerId}`
      );

      if (!breakouRoomName || !userId || !peerId) {
        console.error("Invalid roomName, userId, or peerId");
        socket.emit("join-error", "Invalid room or user data");
        return;
      }

      // 儲存房間和使用者信息
      console.log(
        "Received breakout room Name:",
        breakouRoomName,
        "userId:",
        userId,
        "peerId:",
        peerId
      );
      // socket.data.roomName = roomName;
      // socket.data.userId = userId;
      socket.data.peerId = peerId;

      console.log("Data stored in socket:", socket.data);
      socket.join(breakouRoomName);
      io.to(breakouRoomName).emit(
        "user-connected-breakoutRoom",
        peerId,
        userId
      );
    } catch (error) {
      console.log(error);
    }
  });

  //   disconnect
  socket.on("disconnect", async () => {
    try {
      console.log("Disconnecting socket data:", socket.data);
      const roomName = socket.data.roomName.roomId;
      const roomUsers = rooms.get(roomName);
      const userId = socket.data.userId;
      console.log("roomName: ", roomName);
      const roomAdmin = await findMainRoomAdmin(roomName);
      console.log("User disconnected");
      handleUserLeave(socket);
      if (roomUsers) {
        console.log(
          `2Room ${roomName} after leaving users:`,
          [...roomUsers.values()].map((u) => `${u.userId} (${u.peerId})`)
        );
      } else {
        console.log(`roomUsers with roomName ${roomName} does not exist`);
      }

      if (userId == roomAdmin[0].user_id) {
        const users = await getAllUsers(roomName);
        const randomAdminIndex = Math.floor(Math.random() * users.length);
        const newAdminId = users[randomAdminIndex].id;
        console.log("newAdminId: ", newAdminId);
        await updateMainRoomAdmin(newAdminId, roomName);
        io.to(roomName).emit("room-admin-update", newAdminId);
      }
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("user-leaving", () => {
    console.log("user leaving socket data:", socket.data);
    const roomName = socket.data.roomName;
    const roomUsers = rooms.get(roomName);
    console.log("User disconnected");
    handleUserLeave(socket);
    if (roomUsers) {
      console.log(
        `3Room ${roomName} after leaving users:`,
        [...roomUsers.values()].map((u) => `${u.userId} (${u.peerId})`)
      );
    } else {
      console.log(`roomUsers with roomName ${roomName} does not exist`);
    }
  });

  async function handleUserLeave(socket) {
    try {
      const roomName = socket.data.roomName.roomId;
      const userId = socket.data.userId;
      const peerId = socket.data.peerId;
      console.log(
        "socket roomName, userId, peerId: ",
        roomName,
        userId,
        peerId
      );
      if (roomName && userId) {
        await removeUserFromMainRoom(roomName, userId);
      }
      if (!roomName || !userId || !peerId) return;
      console.log("rooms.has(roomName): ", rooms.has(roomName));
      if (rooms.has(roomName)) {
        const roomUsers = rooms.get(roomName);
        if (roomUsers.has(userId)) {
          roomUsers.delete(userId);
          socket
            .to(roomName)
            .emit("user-disconnected-mainRoom", peerId, userId);

          console.log(`User ${userId} removed from room ${roomName}`);
        }

        // 如果該房間已無任何使用者，移除該房間
        if (roomUsers.size === 0) {
          rooms.delete(roomName);
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  // toggle mic
  socket.on("toggle-mic-status", (roomName, peerId, userId, isMicMuted) => {
    // 更新静音状态
    if (!userMuteStatus[roomName]) {
      userMuteStatus[roomName] = {};
    }
    userMuteStatus[roomName][userId] = isMicMuted;

    socket.to(roomName).emit("user-mic-status-changed", peerId, isMicMuted);
  });

  //   從 usersPanel 面板 toggle mic
  socket.on("toggle-user-mic", ({ roomId: roomName, userId, isMuted }) => {
    if (!userMuteStatus[roomName]) {
      userMuteStatus[roomName] = {};
    }
    userMuteStatus[roomName][userId] = isMuted;
    console.log(
      "userMuteStatus[roomName]: ",
      roomName,
      userMuteStatus[roomName]
    );
    // 將變更通知給同個房間內的其他用戶
    io.to(roomName).emit("user-mic-status-changed-by-usersPanel", {
      userId,
      isMuted,
    });
  });

  socket.on("sync-mic-icons", ({ roomId: roomName, userId, isMuted }) => {
    io.to(roomName).emit("sync-mic-icons", { userId, isMuted });
  });

  //   change video audio
  socket.on("update-video-stream", (roomName, peerId, userId) => {
    console.log(`${userId} updated their video source in room: ${roomName}`);
    socket.to(roomName).emit("update-video-stream", roomName, peerId, userId);
  });

  socket.on("update-audio-source", (roomName, peerId, userId) => {
    console.log(
      `User ${userId} in room ${roomName} updated their audio source`
    );

    // 將音訊更新事件廣播給房間內的其他用戶
    socket.to(roomName).emit("user-audio-source-updated", peerId, userId);
  });

  // toggle video
  socket.on("toggle-video-status", (roomName, peerId, userId, isVideoMuted) => {
    console.log(
      `${userId} (${peerId}) toggled video status to: ${isVideoMuted}`
    );

    // 廣播給同房間的其他使用者
    socket.to(roomName).emit("toggle-video-status", peerId, isVideoMuted);
  });

  // finish grouping
  socket.on("finish-grouping", (data, timerInputValue, roomName) => {
    io.to(roomName).emit("start-breakoutRoom", data.data, timerInputValue);
    setTimeout(() => {
      io.to(roomName).emit("return-to-main-room", roomName);
    }, timerInputValue * 1000);
  });

  // return to main room
  socket.on("rejoin-main-room", (roomName, peerId, userId) => {
    io.to(roomName).emit("rejoin-main-room", peerId, userId);
  });

  // 處理開始螢幕分享
  socket.on("start-screen-share", (roomName, peerId) => {
    socket.to(roomName).emit("user-screen-share-started", peerId);
  });

  // 處理停止螢幕分享
  socket.on("stop-screen-share", (roomName, peerId) => {
    socket.to(roomName).emit("user-screen-share-stopped", peerId);
  });

  // 加入房間
  socket.on("user-join-request", (payload, roomName) => {
    console.log("user-join-request in:", roomName);
    socket.join(roomName);
    socket.to(roomName).emit("user-join-request", payload, roomName);
  });

  socket.on("reject-join-request", (roomName) => {
    socket.to(roomName).emit("reject-join-request", { reject: true });
  });

  socket.on("accept-join-request", (roomName) => {
    socket.to(roomName).emit("accept-join-request", { accept: true });
  });

  // 投票
  socket.on("start-poll", ({ question, options }, roomName) => {
    console.log(`start-poll: ${roomName}`, { question, options });
    if (!roomName) return;

    polls[roomName] = { question, options, votes: {} };
    io.to(roomName).emit("show-poll", { question, options });
  });

  socket.on("end-poll", (roomName) => {
    console.log(`end-poll: ${roomName}`);
    if (!roomName) return;

    const poll = polls[roomName];
    if (poll) {
      const results = calculateResults(poll);
      io.to(roomName).emit("show-results", results);
      delete polls[roomName];
    }
  });

  socket.on("vote", (option, roomName) => {
    console.log(`vote-poll: ${roomName}`, option);
    if (!roomName) return;
    console.log("polls[roomName]: ", polls[roomName]);

    const poll = polls[roomName];
    console.log("roomName: ", roomName);
    console.log("polls: ", polls);
    console.log("poll: ", poll);
    if (poll) {
      poll.votes[socket.id] = option;
      const results = calculateResults(poll);
      io.to(roomName).emit("update-results", results);
    }
  });

  function calculateResults(poll) {
    const totalVotes = Object.values(poll.votes).length;
    console.log("totalVotes: ", totalVotes);
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

  // emoji
  socket.on("emoji-selected", (emoji, roomName) => {
    // 廣播給所有其他使用者
    console.log("emoji-selected: ", roomName);
    io.to(roomName).emit("emoji-selected", emoji);
  });

  // chat panel
  socket.on("send-message", async ({ roomId: roomName, message, userName }) => {
    console.log(roomName);
    if (message && message.trim() !== "") {
      const chatMessage = { userName, message };
      console.log(chatMessage);
      // Save the message in Redis
      await redisClient.rPush(`chat:${roomName}`, JSON.stringify(chatMessage));

      // Emit the message to all users in the room
      io.to(roomName).emit("receive-message", chatMessage);
    }
  });

  // Load messages for a specific room
  socket.on("load-chat", async (roomName, callback) => {
    const messages = await redisClient.lRange(`chat:${roomName}`, 0, -1);
    const parsedMessages = messages.map((msg) => JSON.parse(msg));
    callback(parsedMessages);
  });

  // whiteBoard

  socket.on("request-whiteboard-state", async (roomName) => {
    try {
      const whiteboardState = await redisClient.lRange(
        `whiteboard:${roomName}`,
        0,
        -1
      );
      const parsedState = whiteboardState.map((line) => JSON.parse(line));
      socket.emit("current-whiteboard-state", parsedState);
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("draw", async (data) => {
    try {
      await redisClient.rPush(
        `whiteboard:${data.roomId}`,
        JSON.stringify(data)
      );
      socket.to(data.roomId).emit("draw", data);
    } catch (error) {
      console.error("Error saving whiteboard data to Redis:", error);
    }
  });

  socket.on("clear-whiteboard", async (roomName) => {
    try {
      await redisClient.del(`whiteboard:${roomName}`);
      socket.to(roomName).emit("clear-whiteboard");
    } catch (error) {
      console.error("Error clearing whiteboard data from Redis:", error);
    }
  });

  socket.on("video_ready", async (urlObj) => {
    try {
      const roomId = urlObj.url.split("_")[1];
      // console.log("video ready url: ", urlObj.url, "roomId", roomId);
      const updateRoomSrtResponse = await updateRoomConvertedVideoUrl(
        roomId,
        urlObj.url
      );
    } catch (error) {
      console.error(error);
    }
  });

  // srt ready
  socket.on("srt_ready", async (urlObj) => {
    try {
      const roomId = urlObj.url.split("_")[1];
      // console.log("srt ready url: ", urlObj.url, "roomId", roomId);
      const updateRoomSrtResponse = await updateRoomSrtUrl(roomId, urlObj.url);
    } catch (error) {
      console.error(error);
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
