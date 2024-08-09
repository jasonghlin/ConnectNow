// 驗證JWT
import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
const { JWT_SECRET_KEY } = process.env;

const authenticateJWT = (req, res, next) => {
  if (req.header("Authorization")) {
    const accessToken = req.header("Authorization").replace("Bearer ", "");
    jwt.verify(accessToken, JWT_SECRET_KEY, (err, payload) => {
      if (err) {
        return res.status(403).json({ message: "Client Error (Wrong token)" });
      }
      req.payload = payload;
      return next();
    });
  } else {
    return res.status(401).json({ message: "Client Error (No token)" });
  }
};

export { authenticateJWT };
