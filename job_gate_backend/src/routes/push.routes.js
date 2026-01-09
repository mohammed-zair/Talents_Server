// file: src/routes/push.routes.js

const express = require("express");
const router = express.Router();
const pushController = require("../controllers/push.controller");
const { verifyToken } = require("../middleware/authJwt");
const verifyAdmin = require("../middleware/verifyAdmin");
//   يجب أن يكون محمياً بـ authJwt و verifyAdmin
router.post("/send", verifyToken, verifyAdmin, pushController.sendPushToUser);
router.get(
  "/",
  verifyToken,
  verifyAdmin,
  pushController.listSentPushNotifications
);

module.exports = router;
