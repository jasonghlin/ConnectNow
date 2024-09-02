import fs from "fs";
import os from "os";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export function convertToMovStream(webmBuffer, callback) {
  const tempInputPath = path.join(os.tmpdir(), "input.webm");
  const tempOutputPath = path.join(os.tmpdir(), "output.mov");

  console.log(`Temp input path: ${tempInputPath}`);
  console.log(`Temp output path: ${tempOutputPath}`);

  // 写入 WebM 文件
  fs.writeFileSync(tempInputPath, webmBuffer);

  // 确保文件已写入
  if (!fs.existsSync(tempInputPath)) {
    return callback(new Error("Failed to write input file"), null);
  }

  ffmpeg(tempInputPath)
    .output(tempOutputPath)
    .videoCodec("libx264")
    .audioCodec("aac")
    .format("mov")
    .on("start", (commandLine) => {
      console.log(`Spawned FFmpeg with command: ${commandLine}`);
    })
    .on("error", (err) => {
      console.error("Error during conversion:", err);
      callback(err, null);
    })
    .on("end", () => {
      console.log("Conversion to MOV completed.");

      // 延迟读取文件
      setTimeout(() => {
        if (fs.existsSync(tempOutputPath)) {
          console.log("Output file still exists.");
          fs.stat(tempOutputPath, (err, stats) => {
            if (err) {
              console.error("Error getting file stats:", err);
              callback(new Error("Failed to get file stats"), null);
            } else {
              console.log(`File stats: ${JSON.stringify(stats)}`);
              const movStream = fs.createReadStream(tempOutputPath);
              callback(null, movStream);
            }
          });
        } else {
          console.error("Output file no longer exists after delay.");
          callback(new Error("Output file not found after delay"), null);
        }
      }, 1000); // 延迟1000毫秒
    })
    .run();
}
