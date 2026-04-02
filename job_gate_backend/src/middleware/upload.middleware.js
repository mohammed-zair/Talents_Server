const multer = require("multer");
const path = require("path");
const fs = require("fs");

const cvUploadDir = path.join(__dirname, "..", "..", "uploads", "cvs");
const applicationUploadDir = path.join(
  __dirname,
  "..",
  "..",
  "uploads",
  "application-fields"
);
const CV_FIELD_NAMES = new Set(["cv_file", "file", "cv"]);

const ensureUploadDir = (targetDir) => {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const targetDir = CV_FIELD_NAMES.has(file.fieldname)
      ? cvUploadDir
      : applicationUploadDir;
    ensureUploadDir(targetDir);
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const userId = req.user ? req.user.user_id : "anonymous";
    const suffix = Math.random().toString(36).slice(2, 10);
    cb(null, `${userId}-${Date.now()}-${suffix}${ext}`);
  },
});

const ALLOWED_CV_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ALLOWED_APPLICATION_FILE_MIME_TYPES = new Set([
  ...ALLOWED_CV_MIME_TYPES,
  "image/jpeg",
  "image/png",
  "text/plain",
]);

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = CV_FIELD_NAMES.has(file.fieldname)
    ? ALLOWED_CV_MIME_TYPES
    : ALLOWED_APPLICATION_FILE_MIME_TYPES;

  if (allowedMimeTypes.has(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(
    new Error(
      CV_FIELD_NAMES.has(file.fieldname)
        ? "Unsupported CV format. Please upload PDF, DOC, or DOCX."
        : "Unsupported application file format. Please upload PDF, DOC, DOCX, JPG, PNG, or TXT."
    ),
    false
  );
};

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
  fileFilter,
});

exports.uploadCV = (req, res, next) => {
  const uploadFields = upload.any();

  uploadFields(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "Uploaded file is too large. Maximum allowed size is 5MB."
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

    const files = Array.isArray(req.files) ? req.files : [];
    req.file = files.find((file) => CV_FIELD_NAMES.has(file.fieldname)) || req.file;
    req.applicationFiles = files.filter(
      (file) => !CV_FIELD_NAMES.has(file.fieldname)
    );

    next();
  });
};

exports.cvUploader = upload;
