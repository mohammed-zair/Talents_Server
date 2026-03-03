const jwt = require("jsonwebtoken");
const { User, Company } = require("../models");

exports.verifyToken = async (req, res, next) => {
  try {
    const authHeader =
      req.headers["authorization"] || req.headers["Authorization"];

    if (!authHeader) {
      return res.status(401).json({ message: "Please login." });
    }

    const token = String(authHeader).startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : String(authHeader).trim();

    if (!token) {
      return res.status(401).json({ message: "Please login." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded?.user_id) {
      const user = await User.findByPk(decoded.user_id, {
        attributes: ["user_id", "is_deleted", "is_active"],
      });
      if (!user || user.is_deleted || user.is_active === false) {
        return res.status(401).json({ message: "Account deleted or inactive." });
      }
    }

    if (decoded?.role === "company" && decoded?.company_id) {
      const company = await Company.findByPk(decoded.company_id, {
        attributes: ["company_id", "is_deleted"],
      });
      if (!company || company.is_deleted) {
        return res.status(401).json({ message: "Account deleted." });
      }
    }

    req.user = decoded;
    next();
  } catch (_) {
    return res.status(401).json({ message: "Invalid JWT token." });
  }
};
