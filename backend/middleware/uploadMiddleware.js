const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create storage directory if it doesn't exist
const storageDir = path.join(__dirname, "../uploads/voices");
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, storageDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, "_")}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Accept audio files only
  if (file.mimetype.startsWith("audio/")) {
    cb(null, true);
  } else {
    cb(new Error("Not an audio file! Please upload only audio."), false);
  }
};

module.exports = multer({ storage, fileFilter });
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create storage directory if it doesn't exist
const storageDir = path.join(__dirname, "../uploads/voices");
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, storageDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, "_")}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Accept audio files only
  if (file.mimetype.startsWith("audio/")) {
    cb(null, true);
  } else {
    cb(new Error("Not an audio file! Please upload only audio."), false);
  }
};

module.exports = multer({ storage, fileFilter });
