// file: src/routes/auth.routes.js

const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { verifyToken } = require("../middleware/authJwt");

/**
 *   دوال المصادقة (Public)
 * المسارات: /api/auth/login و /api/auth/register-jobseeker
 */
router.post("/login", userController.login);
router.post("/register-jobseeker/send-otp", userController.sendJobSeekerRegistrationOtp);
router.post("/register-jobseeker/verify-otp", userController.verifyJobSeekerRegistrationOtp);
router.post("/register-jobseeker", userController.registerJobSeeker);

// Forgot / Reset Password (Public)
router.post("/forgot-password", userController.forgotPassword);
router.post("/reset-password", userController.resetPassword);
router.post("/delete-account/request", verifyToken, userController.requestDeleteAccount);
router.post("/delete-account/confirm", verifyToken, userController.confirmDeleteAccount);

module.exports = router;

 
