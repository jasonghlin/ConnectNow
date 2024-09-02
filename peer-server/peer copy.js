import { PeerServer } from "peer";
import dotenv from "dotenv";
dotenv.config();

const { ENV } = process.env;

if (ENV === "production") {
  PeerServer({
    port: 9001,
    path: "/myapp",
    // proxied: false,
    proxied: true,
    secure: true,
  });
} else {
  PeerServer({
    port: 9001,
    path: "/myapp",
    // proxied: false,
    proxied: true,
  });
}
