import { PeerServer } from "peer";

PeerServer({
  port: 443,
  path: "/myapp",
  // proxied: false,
  proxied: true,
});
