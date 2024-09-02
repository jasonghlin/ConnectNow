import { ExpressPeerServer } from "peer";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const { ENV } = process.env;

// 建立 Express 應用程式
const app = express();
app.use(cors()); // 允许所有来源访问

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

app.get("/health", (req, res) => {
  res.send({ ok: true });
});

const server = app.listen(9001);

const peerServer = ExpressPeerServer(server, {
  path: "/myapp",
});

server.on("error", (err) => {
  console.error("Server error:", err);
});

peerServer.on("error", (err) => {
  console.error("PeerServer error:", err);
});

// 讓 Express 使用 PeerJS server
app.use(peerServer);
