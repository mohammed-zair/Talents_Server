const multer = require("multer");

const storage = multer.memoryStorage();

const isImage = (mimetype) => Boolean(mimetype && mimetype.startsWith("image/"));
const isLicenseDoc = (mimetype) =>
  mimetype === "application/pdf" ||
  mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
  isImage(mimetype);

const fileFilter = (req, file, cb) => {
  if (file.fieldname === "logo") {
    return isImage(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only image files are allowed for logo"), false);
  }

  if (file.fieldname === "license_doc") {
    return isLicenseDoc(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only PDF, DOCX, or image files are allowed for license"), false);
  }

  return cb(new Error(`Unexpected file field: ${file.fieldname}`), false);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
