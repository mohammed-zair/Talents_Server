const router = require("express").Router();
const {
  matchAndDeliverCVs,
} = require("../controllers/admin/companyCVMatching.controller");

const authMiddleware = require("../middleware/authJwt");
const verifyAdmin = require("../middleware/verifyAdmin");

// تنفيذ المطابقة وتسليم CVs
router.post(
  "/match/:requestId",
  authMiddleware.verifyToken,
  verifyAdmin,
  matchAndDeliverCVs
);

module.exports = router;