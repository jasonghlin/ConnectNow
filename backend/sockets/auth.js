import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();
const { JWT_SECRET_KEY } = process.env;

export default function socketAuth(io, jwt) {
  return (socket, next) => {
    // get token
    const req = socket.request;
    const token = req.session ? req.session.token : null;

    if (!token) {
      const err = new Error("Authentication error: No token provided");
      err.data = { content: "Please provide a valid token" };
      socket.disconnect();
      return next(err);
    }

    jwt.verify(token, JWT_SECRET_KEY, (err, decoded) => {
      if (err) {
        const authError = new Error("Authentication error: Invalid token");
        authError.data = { content: "Please provide a valid token" };
        return next(authError);
      }

      // 驗證成功就將用戶訊息 attach 到 socket.user
      socket.user = decoded;
      console.log("socket.user: ", socket.user);
      next();
    });
  };
}
