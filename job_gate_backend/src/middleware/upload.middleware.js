const multer = require("multer");
const path = require("path");

 // 1. تحديد مكان التخزين (Storage)
 const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // تحديد المجلد الذي سيتم فيه حفظ الملفات
    // يجب التأكد من وجود المجلد: /uploads/cvs
    cb(null, path.join(__dirname, "..", "..", "uploads", "cvs"));
  },
  filename: (req, file, cb) => {
    // تحديد اسم الملف: (userId-timestamp.ext)
    // يُفترض أن req.user تم تعيينه بواسطة authJwt قبله
    const ext = path.extname(file.originalname);
    const userId = req.user ? req.user.user_id : "anonymous";
    cb(null, `${userId}-${Date.now()}${ext}`);
  },
});

 // 2. تطبيق الفلترة (File Filter)
 const fileFilter = (req, file, cb) => {
  // قبول فقط ملفات PDF و DOCX
  if (
    file.mimetype === "application/pdf" ||
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    cb(null, true);
  } else {
    // رفض أنواع الملفات الأخرى
    cb(
      new Error("صيغة الملف غير مدعومة. يرجى رفع ملف بصيغة PDF أو DOCX."),
      false
    );
  }
};

 // 3. إعداد Multer (الكائن الخام)
 const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5, // الحد الأقصى لحجم الملف 5MB
  },
  fileFilter: fileFilter,
});

/**
 *   التصدير الرئيسي (uploadCV): دالة Middleware مغلفة لـ CV
 * تُعالج الرفع (single) وتُعالج أخطاء Multer بشكل جيد.
 * يجب استخدامها مباشرةً في المسارات (مثل uploadMiddleware.uploadCV).
 */
exports.uploadCV = (req, res, next) => {
  const uploadFields = upload.fields([
    { name: "cv_file", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]);

  uploadFields(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // خطأ من Multer (مثل حجم الملف أو نوعه)
      return res
        .status(400)
        .json({ message: "فشل في رفع الملف: " + err.message });
    } else if (err) {
      // خطأ غير متوقع (مثل خطأ في الفلترة)
      return res.status(400).json({ message: err.message });
    } // لا يوجد خطأ، أكمل إلى الـ Controller

    const files = req.files || {};
    req.file =
      (files.cv_file && files.cv_file[0]) ||
      (files.file && files.file[0]) ||
      req.file;

    next();
  });
};

/**
 * تصدير كائن Multer الخام (للاستخدام المرن) - اختياري
 * يمكنك استخدام هذا في المسارات مباشرةً: cvUploader.single('field_name')
 */
exports.cvUploader = upload;
