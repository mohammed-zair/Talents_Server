const express = require("express");
const router = express.Router();
const companyAuthController = require("../controllers/companyAuth.controller");

router.post("/login", companyAuthController.loginCompany);

module.exports = router;
