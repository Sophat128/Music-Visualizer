const express = require("express");
const busboy = require("busboy");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { spawn } = require("child_process");

const app = express();

// --- CORS middleware ---
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// --- Export video route ---
app.post("/export-video", (req, res) => {
  const bb = busboy({ headers: req.headers });
  const tmpdir = os.tmpdir();
  const files = {};
  const fields = {};
  const fileWrites = [];

  // --- Save uploaded files ---
  bb.on("file", (name, file, info) => {
    const filepath = path.join(tmpdir, info.filename || `upload-${Date.now()}`);
    files[name] = filepath;

    const writeStream = fs.createWriteStream(filepath);
    file.pipe(writeStream);

    const promise = new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });
    fileWrites.push(promise);
  });

  // --- Capture form fields ---
  bb.on("field", (name, val) => fields[name] = val);

  bb.on("finish", async () => {
    let videoPath, outputPath;
    try {
      await Promise.all(fileWrites);

      videoPath = files["video"];
      if (!videoPath) return res.status(400).json({ error: "No video uploaded" });

      const outputFormat = fields.format || "mp4";
      const outputFileName = `export-${Date.now()}.${outputFormat}`;
      outputPath = path.join(tmpdir, outputFileName);

      const resolution = fields.resolution === "1080p" ? "1920:1080" : "1280:720";
      const audioBitrate = fields.audioQuality ? fields.audioQuality.replace("kbps", "k") : '192k';

      // --- Build FFmpeg arguments ---
      const ffmpegArgs = [
        "-y", // overwrite if file exists
        "-i", videoPath,
        "-vf", `scale=${resolution}:force_original_aspect_ratio=decrease,pad=${resolution}:(ow-iw)/2:(oh-ih)/2`,
        "-r", fields.fps || "30",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", audioBitrate,
        "-pix_fmt", "yuv420p",
        outputPath
      ];

      console.log("Running ffmpeg with args:", ffmpegArgs.join(" "));

      const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

      ffmpegProcess.stdout.on("data", (data) => console.log(`ffmpeg stdout: ${data}`));
      ffmpegProcess.stderr.on("data", (data) => console.log(`ffmpeg stderr: ${data}`));

      ffmpegProcess.on("close", (code) => {
        if (code === 0) {
          console.log("FFmpeg finished successfully");

          // --- Stream MP4 back to browser ---
          const fileStream = fs.createReadStream(outputPath);
          res.setHeader('Content-Type', 'video/mp4');
          res.setHeader('Content-Disposition', `attachment; filename="${outputFileName}"`);

          fileStream.pipe(res);

          fileStream.on('close', () => {
            // --- Clean up temporary files ---
            fs.unlinkSync(outputPath);
            Object.values(files).forEach(fp => fs.unlinkSync(fp));
          });

        } else {
          console.error(`FFmpeg exited with code ${code}`);
          res.status(500).json({ error: `FFmpeg exited with code ${code}` });
          // Cleanup
          if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
          Object.values(files).forEach(fp => { if (fs.existsSync(fp)) fs.unlinkSync(fp); });
        }
      });

      ffmpegProcess.on("error", (err) => {
        console.error("FFmpeg error:", err);
        res.status(500).json({ error: err.message });
        if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        Object.values(files).forEach(fp => { if (fs.existsSync(fp)) fs.unlinkSync(fp); });
      });

    } catch (err) {
      console.error("Export error:", err);
      res.status(500).json({ error: err.message });
      if (videoPath && fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
  });

  req.pipe(bb);
});

// --- Start server ---
app.listen(8080, () => console.log("Local video export server running on http://localhost:8080"));
