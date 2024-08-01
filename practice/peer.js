import { PeerServer } from "peer";
import dotenv from "dotenv";
dotenv.config();

const { ENV } = process.env;

if (ENV === "production") {
  PeerServer({
    port: 443,
    path: "/myapp",
    // proxied: false,
    proxied: true,
    ssl: {
      key: fs.readFileSync("/home/ubuntu/cloudflare_SSL_key.pem"),
      cert: fs.readFileSync("/home/ubuntu/cloudflare_SSL_cert.pem"),
    },
  });
} else {
  PeerServer({
    port: 9001,
    path: "/myapp",
    // proxied: false,
    proxied: true,
  });
}
