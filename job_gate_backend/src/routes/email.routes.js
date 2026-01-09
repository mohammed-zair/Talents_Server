// file: src/routes/email.routes.js

const express = require("express");
const router = express.Router();
const emailController = require("../controllers/email.controller");
const { verifyToken } = require("../middleware/authJwt");
const verifyAdmin = require("../middleware/verifyAdmin");

// Admin - Send email to company (by company_id or direct email)
router.post("/send", verifyToken, verifyAdmin, emailController.sendEmailToCompany);

// Admin - Send custom email (optional)
router.post("/send/custom", verifyToken, verifyAdmin, emailController.sendCustomEmail);

// Admin - List email logs
router.get("/", verifyToken, verifyAdmin, emailController.listSentEmails);

module.exports = router;
