import express from "express";
import dotenv from "dotenv";
import { join } from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { authenticateJWT } from "../../public/utils/authenticateJWT.js";
import { createMainRoom } from "../../models/createMainRoom.js";
import { createBreakoutRoom } from "../../models/createBreakoutRoom.js";
import { joinBreakoutRoom } from "../../models/joinBreakoutRoom.js";
import { findMainRoomAdmin } from "../../models/findMainRoomAdmin.js";
import { createRoomVideoSrtUrl } from "../../models/createRoomVideoSrtUrl.js";
import { getRoomVideoRecords } from "../../models/getRoomVideoRecords.js";
import { userMuteStatus } from "../sockets/socketMedia.js";

dotenv.config();
const {
  JWT_SECRET_KEY,
  ENV,
  AWS_ACCESS_KEY,
  AWS_SECRET_KEY,
  BUCKET_NAME,
  SQS_URL,
} = process.env;

const router = express.Router();
const s3Client = new S3Client({
  region: "us-west-2",
  credentials: { accessKeyId: AWS_ACCESS_KEY, secretAccessKey: AWS_SECRET_KEY },
});

function generateRoomName() {
  const part1 = Math.random().toString(36).substring(2, 8);
  const part2 = Math.random().toString(36).substring(2, 8);
  return `${part1}-${part2}`;
}

router.post("/api/mainRoom", authenticateJWT, async (req, res) => {
  const roomName = generateRoomName();
  await createMainRoom(req.payload, roomName);
  res.status(200).json({ ok: true, roomId: roomName });
});

// join breakout room
router.get(
  "/breakoutRoom/:mainRoomId/:breakoutRoomId",
  authenticateJWT,
  async (req, res) => {
    try {
      const { mainRoomId, breakoutRoomId } = req.params;
      console.log("join breakout room: ", breakoutRoomId);
      // create breakoutRoom
      const breakoutRoomCreation = await createBreakoutRoom(breakoutRoomId);
      console.log("breakoutRoomCreation: ", breakoutRoomCreation);
      console.log("breakout room: ", breakoutRoomId, "created");
      const joinBreakOutRoomSuccess = await joinBreakoutRoom(
        req.payload,
        mainRoomId,
        breakoutRoomId
      );
      console.log("joinBreakoutRoomSuccess: ", joinBreakOutRoomSuccess);
      res.sendFile(join(workingDirectory, "public", "room.html"));
    } catch (error) {
      console.log(error);
    }
  }
);

router.get("/api/muteStatus/:roomId", authenticateJWT, (req, res) => {
  const { roomId: roomName } = req.params;
  const muteStatus = userMuteStatus[roomName] || {};
  res.json(muteStatus);
});

router.get("/api/roomAdmin/:roomId", authenticateJWT, async (req, res) => {
  const { roomId: roomName } = req.params;
  const roomAdminId = await findMainRoomAdmin(roomName);
  res.json(roomAdminId);
});

router.get("/api/roomVideoRecords", authenticateJWT, async (req, res) => {
  const videoRecords = await getRoomVideoRecords(req.payload.userId);
  console.log("videoRecords: ", videoRecords);
  res.json(videoRecords);
});

router.get("/presignedUrl", authenticateJWT, async (req, res) => {
  const { fileName, fileType } = req.query;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `videoRecord/raw-videos/${fileName}`,
    ContentType: fileType,
    ACL: "private",
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 60 });
  res.json({ url });
});

const sqsClient = new SQSClient({
  region: "us-west-2",
  credentials: { accessKeyId: AWS_ACCESS_KEY, secretAccessKey: AWS_SECRET_KEY },
});

router.post("/videoRecord", authenticateJWT, async (req, res) => {
  const { fileName, roomId: roomName } = req.body;

  const sqsParams = {
    QueueUrl: SQS_URL,
    MessageBody: JSON.stringify({
      s3Key: `videoRecord/raw-videos/${fileName}`,
      s3Bucket: BUCKET_NAME,
    }),
    MessageGroupId: "default",
  };

  try {
    const roomSrtresult = await createRoomVideoSrtUrl(
      roomName,
      req.payload.userId
    );
    const data = await sqsClient.send(new SendMessageCommand(sqsParams));
    res
      .status(200)
      .json({ message: "File uploaded and task added to SQS", data });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Error sending message to SQS", details: error });
  }
});

export default router;
