// 驗證JWT
import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
const { JWT_SECRET_KEY } = process.env;

const authenticateJWT = (req, res, next) => {
  const token =
    req.cookies.token || // 從 cookie 中獲取 token
    (req.header("Authorization") &&
      req.header("Authorization").replace("Bearer ", "")); // 從 Authorization 標頭中獲取 token

  if (!token) {
    return res.status(401).json({ message: "Client Error (No token)" });
  }

  jwt.verify(token, JWT_SECRET_KEY, (err, payload) => {
    if (err) {
      return res.status(403).json({ message: "Client Error (Wrong token)" });
    }
    req.payload = payload;
    return next();
  });
};
export { authenticateJWT };
