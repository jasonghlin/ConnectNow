import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();
const { JWT_SECRET_KEY } = process.env;

export default function socketAuth(io, jwt) {
  return (socket, next) => {
    // 从客户端的认证数据中获取 token，通常是通过 auth 传递
    const token = socket.handshake.auth.token;

    if (!token) {
      const err = new Error("Authentication error: No token provided");
      err.data = { content: "Please provide a valid token" }; // 对错误添加额外数据
      socket.disconnect();
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
  };
}
