const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "..", "..", "uploads", "cvs");

const ensureUploadDir = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDir();
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const userId = req.user ? req.user.user_id : "anonymous";
    cb(null, `${userId}-${Date.now()}${ext}`);
  },
});

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error("Unsupported CV format. Please upload PDF, DOC, or DOCX."), false);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
  fileFilter,
});

exports.uploadCV = (req, res, next) => {
  const uploadFields = upload.fields([
    { name: "cv_file", maxCount: 1 },
    { name: "file", maxCount: 1 },
    { name: "cv", maxCount: 1 },
  ]);

  uploadFields(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "CV is too large. Maximum allowed size is 5MB."
          : `File upload failed: ${err.message}`;

      return res.status(400).json({
        message,
        error_code: err.code || "UPLOAD_ERROR",
      });
    }

    if (err) {
      return res.status(400).json({
        message: err.message || "Failed to upload file.",
        error_code: "INVALID_FILE",
      });
    }

    const files = req.files || {};
    req.file =
      (files.cv_file && files.cv_file[0]) ||
      (files.file && files.file[0]) ||
      (files.cv && files.cv[0]) ||
      req.file;

    next();
  });
};

exports.cvUploader = upload;
