const verifyCompanyApproved = (req, res, next) => {
  try {
    const company = req.company;
    if (!company) {
      return res.status(403).json({
        message: "معرف الشركة غير موجود",
      });
    }

    if (!company.is_approved) {
      return res.status(403).json({
        message: "الشركة غير موثقة بعد. لا يمكن النشر أو طلب خدمات الشركات.",
      });
    }

    return next();
  } catch (error) {
    console.error("verifyCompanyApproved error:", error);
    return res.status(500).json({
      message: "خطأ أثناء التحقق من اعتماد الشركة",
    });
  }
};

module.exports = verifyCompanyApproved;
