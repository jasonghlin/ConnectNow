// routes/userRouter.js
import express from "express";
import bcrypt from "bcrypt";
import { getUser } from "../../models/registerAndLoginGetUser.js";
import { createUser } from "../../models/createUser.js";
import { createAccessToken } from "../../public/utils/createAccessToken.js";
import { hashPassword } from "../../public/utils/hashPassword.js";
import { authenticateJWT } from "../../public/utils/authenticateJWT.js";
import { getAllUsers } from "../../models/getAllUsers.js";
import { saveGroups } from "../../models/saveGroups.js";

const router = express.Router();

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
                  httpOnly: true,
                  secure: req.protocol === "https",
                  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天的有效期
                })
                .json({ token, username: user[0].name });
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
  res.json({ message: "Authenticated", payload: req.payload });
});

router.get("/api/allUsers", authenticateJWT, async (req, res) => {
  try {
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
    const users = await getAllUsers(roomId);
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

    // 通知所有客戶端
    // io.emit("groups-finished", result);

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

export default router;
