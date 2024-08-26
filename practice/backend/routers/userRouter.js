// routes/userRouter.js
import express from "express";
import bcrypt from "bcrypt";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";
import dotenv from "dotenv";
import { getUser } from "../../models/registerAndLoginGetUser.js";
import { createUser } from "../../models/createUser.js";
import { createAccessToken } from "../../public/utils/createAccessToken.js";
import { hashPassword } from "../../public/utils/hashPassword.js";
import { authenticateJWT } from "../../public/utils/authenticateJWT.js";
import { getAllUsers } from "../../models/getAllUsers.js";
import { saveGroups } from "../../models/saveGroups.js";
import { updateUserName } from "../../models/updateUserName.js";
import { updateUserEmail } from "../../models/updateUserEmail.js";
import { updateUserPassword } from "../../models/updateUserPassword.js";
import { getDbUserImg } from "../../models/getDbUserImg.js";
import { updateDbUserImg } from "../../models/updateDbUserImg.js";
import { getAllBreakoutRoomUsers } from "../../models/getAllBreakoutRoomUsers.js";

dotenv.config();
const { ENV, AWS_ACCESS_KEY, AWS_SECRET_KEY, BUCKET_NAME } = process.env;

const router = express.Router();
const upload = multer();
const s3Client = new S3Client({
  region: "us-west-2", // 替换为你实际的区域
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY,
  },
});

// Register
router.post("/api/user", async (req, res) => {
  try {
    const userExist = await getUser(req.body);
    if (userExist.length === 0) {
      const hash_password = await hashPassword(req.body.password);
      const userId = await createUser(
        req.body.name,
        req.body.email,
        hash_password
      );
      res.status(201).json({ message: "註冊成功", userId });
    } else {
      res.status(400).json({ message: "此 email 已註冊過" });
    }
  } catch (error) {
    console.error("Error registering user:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

// Login
router.put("/api/user/auth", async (req, res) => {
  try {
    const user = await getUser(req.body);
    if (user.length > 0) {
      bcrypt.compare(
        req.body.password,
        user[0].password_hash,
        async (error, result) => {
          if (error) {
            console.error("Error comparing passwords:", error);
            res
              .status(500)
              .json({ error: "Internal Server Error", details: error.message });
          } else if (result) {
            try {
              const token = await createAccessToken(
                user[0].id,
                user[0].name,
                user[0].email
              );
              res
                .status(200)
                .cookie("token", token, {
                  httpOnly: false,
                  secure: req.protocol === "https",
                  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天的有效期
                })
                .json({ token, username: user[0].name, userId: user[0].id });
            } catch (tokenError) {
              console.error("Error creating token:", tokenError);
              res.status(500).json({
                error: "Internal Server Error",
                details: tokenError.message,
              });
            }
          } else {
            res
              .status(401)
              .json({ error: "Unauthorized", details: "密碼錯誤" });
          }
        }
      );
    } else {
      res
        .status(401)
        .json({ error: "Unauthorized", details: "登入失敗，帳號或密碼錯誤" });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

// Authenticate user
router.get("/api/user/auth", authenticateJWT, (req, res) => {
  console.log();
  res.json({ message: "Authenticated", payload: req.payload });
});

// getAll user
router.get("/api/allUsers", authenticateJWT, async (req, res) => {
  try {
    console.log("url: ", req.headers.referer);
    const url = req.headers.referer;
    if (!url) {
      console.error("Referer header is missing");
      return res.status(400).json({ error: "Unable to determine room ID" });
    }
    const urlParts = url.split("/");
    const roomId = urlParts[urlParts.length - 1];

    if (!roomId) {
      console.error("Unable to extract room ID from URL");
      return res.status(400).json({ error: "Unable to determine room ID" });
    }

    console.log("Fetching users for room:", roomId);
    let users;
    if (roomId.startsWith("breakout-")) {
      users = await getAllBreakoutRoomUsers(roomId);
    } else {
      users = await getAllUsers(roomId);
    }
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching all users:", error);
    if (error.message.includes("No main room found")) {
      res.status(404).json({ error: "Room not found" });
    } else {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});

router.post("/api/groups", authenticateJWT, async (req, res) => {
  try {
    const groups = req.body;
    const result = await saveGroups(groups);
    console.log("create groups:", groups);
    console.log(groups[0].groupId);
    console.log("result: ", result);
    // 通知所有客戶端
    // io.to(groups[0].groupId).emit("start-grouping", result);

    res
      .status(200)
      .json({ message: "Groups saved successfully", data: groups });
  } catch (error) {
    console.error("Error saving groups:", error);
    res
      .status(500)
      .json({ message: "Error saving groups", error: error.message });
  }
});

// update user info
router.patch("/api/user/userInfo", authenticateJWT, async (req, res) => {
  console.log(req.body);
  console.log(req.payload);
  try {
    if (req.body.name) {
      const result = await updateUserName(req.body.name, req.payload.userId);

      if (result) {
        const token = await createAccessToken(
          req.payload.userId,
          req.body.name,
          req.payload.userEmail
        );

        res
          .status(200)
          .cookie("token", token, {
            httpOnly: false,
            secure: req.protocol === "https",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天的有效期
          })
          .json({ token, username: req.body.name });
      }
    } else if (req.body.email) {
      const userExist = await getUser(req.body);
      console.log(userExist.length);
      if (userExist.length > 0) {
        res.status(400).json({ error: true, message: "此 email 已註冊過" });
      } else {
        const result = await updateUserEmail(
          req.body.email,
          req.payload.userId
        );

        if (result) {
          const token = await createAccessToken(
            req.payload.userId,
            req.payload.userName,
            req.body.email
          );

          res
            .status(200)
            .cookie("token", token, {
              httpOnly: false,
              secure: req.protocol === "https",
              maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天的有效期
            })
            .json({ token });
        }
      }
    } else if (req.body.password) {
      const hash_password = await hashPassword(req.body.password);
      const result = updateUserPassword(hash_password, req.payload.userId);
      console.log(result);
      if (result) {
        res.status(200).json({ ok: true });
      }
    }
  } catch (err) {
    console.log(err);
  }
});

// get user Img
router.get("/api/userImg", authenticateJWT, async (req, res) => {
  const result = await getDbUserImg(req.payload.userId);

  if (result) {
    return res.json({
      message: "File found successfully",
      url: result.avatar_url,
    });
  }

  return res.status(404).json({ message: "File not found" });
});

// update userImg
router.post(
  "/api/userImg",
  authenticateJWT,
  upload.single("file"),
  async (req, res) => {
    const file = req.file;

    if (!file || !["image/jpeg", "image/png"].includes(file.mimetype)) {
      return res.status(400).json({ message: "Invalid file type" });
    }

    const fileKey = `user-${req.payload.userId}-${file.originalname}`;

    try {
      // Upload file to S3
      const uploadParams = {
        Bucket: BUCKET_NAME,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      };
      await s3Client.send(new PutObjectCommand(uploadParams));

      // Get file URL
      const fileUrl = `https://d3u8ez3u55dl9n.cloudfront.net/${fileKey}`;
      await updateDbUserImg(req.payload.userId, fileUrl);

      return res.json({ message: "File uploaded successfully", url: fileUrl });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ message: "File upload failed", error: err.message });
    }
  }
);

export default router;
