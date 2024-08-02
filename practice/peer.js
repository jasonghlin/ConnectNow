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
let port;

if (ENV === "production") {
  port = 9001;
} else {
  port = 9001;
}

const server = app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

peerServer = PeerServer({
  path: "/myapp",
  proxied: true,
  secure: ENV === "production", // 根据环境设置secure属性
});

app.use("/peerjs", peerServer);
app.get("/", (req, res) => {
  res.send("PeerJS server is running");
});
