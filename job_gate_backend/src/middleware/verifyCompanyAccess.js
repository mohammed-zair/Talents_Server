const jwt = require("jsonwebtoken");

const verifyCompanyAccess = (req, res, next) => {
  try {
    const token = req.cookies?.company_access;
    if (!token) {
      return res.status(401).json({ message: "Please login." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || decoded.role !== "company") {
      return res.status(403).json({ message: "Company access only." });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired session." });
  }
};

module.exports = verifyCompanyAccess;
