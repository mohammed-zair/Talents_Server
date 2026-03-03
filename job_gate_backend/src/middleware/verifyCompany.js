const { Company } = require("../models");

const verifyCompany = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    if (req.user.role !== "company") {
      return res.status(403).json({ message: "Company access required." });
    }

    const companyId = req.user.company_id;
    if (!companyId) {
      return res.status(403).json({ message: "Company id missing in token." });
    }

    const company = await Company.findByPk(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    if (company.is_deleted) {
      return res.status(401).json({ message: "Account deleted." });
    }

    req.company = company;
    next();
  } catch (error) {
    console.error("verifyCompany error:", error);
    return res.status(500).json({ message: "Failed to verify company access." });
  }
};

module.exports = verifyCompany;
