const { Company } = require("../models");

const verifyCompany = async (req, res, next) => {
  try {
    /**
     * نتأكد أن التوكن مفكوك قبل
     * authJwt.verifyToken
     * ويحط البيانات داخل req.user
     */

    if (!req.user) {
      return res.status(401).json({
        message: "غير مصادق (Token غير موجود)",
      });
    }

    // لازم يكون الدور شركة
    if (req.user.role !== "company") {
      return res.status(403).json({
        message: "هذه العملية مخصصة لحسابات الشركات فقط",
      });
    }

    const companyId = req.user.company_id;

    if (!companyId) {
      return res.status(403).json({
        message: "معرّف الشركة غير موجود في التوكن",
      });
    }

    const company = await Company.findByPk(companyId);

    if (!company) {
      return res.status(404).json({
        message: "الشركة غير موجودة",
      });
    }

    // نربط الشركة بالـ request
    req.company = company;

    next();
  } catch (error) {
    console.error("verifyCompany error:", error);
    return res.status(500).json({
      message: "خطأ أثناء التحقق من صلاحيات الشركة",
    });
  }
};

module.exports = verifyCompany;
 
