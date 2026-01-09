  // file: src/middleware/verifyAdmin.js

module.exports = (req, res, next) => {
  // نتعامل مع أكثر من اسم للحقل (حسب مشروعك/التوكن)
  const role =
    req.user?.user_type || req.user?.role || req.user?.type || req.user?.userRole;

  if (!req.user) {
    return res.status(401).json({ message: "يرجى تسجيل الدخول" });
  }

  // اعتبر الأدمن إذا كان "admin" أو "ADMIN"
  const isAdmin = String(role || "").toLowerCase() === "admin";

  if (!isAdmin) {
    return res.status(403).json({ message: "ليس لديك صلاحية (أدمن فقط)" });
  }

  next();
};
