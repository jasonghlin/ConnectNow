import { PeerServer } from "peer";
import express from "express";
import dotenv from "dotenv";
dotenv.config();

const { ENV } = process.env;

// 建立 Express 應用程式
const app = express();

// 建立 PeerJS server
const peerServer = PeerServer({
  port: 9001,
  path: "/myapp",
});

// 使用 Express 中間件來處理 Cache-Control
app.use((req, res, next) => {
  // 設定 Cache-Control 標頭
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

// 讓 Express 使用 PeerJS server
app.use("/peerjs", peerServer);

// 啟動伺服器
app.listen(9000, () => {
  console.log("PeerJS server running on http://localhost:9001");
});
