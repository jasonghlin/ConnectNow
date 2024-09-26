import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
// const { JWT_SECRET_KEY, ENV } = process.env;

export default async function createAccessToken(
  userId,
  userName,
  userEmail,
  expire
) {
  const payload = {
    userId,
    userName,
    userEmail,
  };
  const options = {
    expiresIn: "7d",
  };

  const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

  return new Promise((resolve, reject) => {
    jwt.sign(payload, JWT_SECRET_KEY, options, (err, token) => {
      if (err) {
        reject(err);
      } else {
        resolve(token);
      }
    });
  });
}
