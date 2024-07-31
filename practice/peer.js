import { PeerServer } from "peer";

PeerServer({
  port: 9001,
  path: "/myapp",
  // proxied: false,
  proxied: true,
});
