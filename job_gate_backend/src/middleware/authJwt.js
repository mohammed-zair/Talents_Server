// file: src/middleware/authJwt.js
const jwt = require("jsonwebtoken");

exports.verifyToken = (req, res, next) => {
  try {
    const authHeader =
      req.headers["authorization"] || req.headers["Authorization"];

    if (!authHeader) {
      return res.status(401).json({ message: "يرجى تسجيل الدخول" });
    }

     const token = String(authHeader).startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : String(authHeader).trim();

    if (!token) {
      return res.status(401).json({ message: "يرجى تسجيل الدخول" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;  
    next();
  } catch (error) {
    return res.status(401).json({ message: "رمز JWT غير صالح" });
  }
};
