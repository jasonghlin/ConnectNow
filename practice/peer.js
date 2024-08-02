import { PeerServer } from "peer";
import dotenv from "dotenv";
import cors from "cors";
import express from "express";

dotenv.config();

const { ENV } = process.env;
const app = express();

// 配置CORS中间件
app.use(
  cors({
    origin: "https://www.connectnow.website", // 允许的源，可以根据需要修改
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);

let peerServer;
if (ENV === "production") {
  const server = app.listen(443, () => {
    console.log("Listening on port 443");
  });

  peerServer = PeerServer({
    port: 443,
    path: "/myapp",
    proxied: true,
    secure: true, // 由于使用ALB进行SSL终端，因此这里为true
  });

  app.use("/peerjs", peerServer);
  app.get("/", (req, res) => {
    res.send("PeerJS server is running");
  });
} else {
  const server = app.listen(9001, () => {
    console.log("Listening on port 9001");
  });

  peerServer = PeerServer({
    port: 9001,
    path: "/myapp",
    proxied: true,
    secure: false,
  });

  app.use("/peerjs", peerServer);
  app.get("/", (req, res) => {
    res.send("PeerJS server is running");
  });
}
