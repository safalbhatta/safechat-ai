const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "..", "uploads", "profile-pictures");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const safeExtension = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(
      extension
    )
      ? extension
      : ".jpg";

    cb(
      null,
      `profile-${req.user._id}-${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}${safeExtension}`
    );
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype?.startsWith("image/")) {
    cb(null, true);
    return;
  }

  cb(new Error("Only image files are allowed"));
};

const profilePictureUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = profilePictureUpload;
