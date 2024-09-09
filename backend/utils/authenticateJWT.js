// 驗證JWT
import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
const { JWT_SECRET_KEY } = process.env;

export const authenticateJWT = (req, res, next) => {
  const token =
    req.cookies.token || // 從 cookie 中獲取 token
    (req.header("Authorization") &&
      req.header("Authorization").replace("Bearer ", "")); // 從 Authorization 標頭中獲取 token

  if (!token) {
    console.log("Client Error (No token)");
    return res.redirect("/");
  }

  jwt.verify(token, JWT_SECRET_KEY, (err, payload) => {
    if (err) {
      console.log("Client Error (Wrong token)");
      return res.redirect("/");
    }
    req.payload = payload;
    return next();
  });
};
