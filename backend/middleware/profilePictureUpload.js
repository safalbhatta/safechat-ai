const multer = require("multer");

// Use memoryStorage so file stays in req.file.buffer
// and gets uploaded directly to ImageKit (no disk I/O)
const storage = multer.memoryStorage();

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
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

module.exports = profilePictureUpload;
