const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const userController = require("./user.controller");

exports.login = async (req, res) => {
  return userController.login(req, res);
};

exports.logout = (req, res) => {
  res.json({ message: "تم تسجيل الخروج بنجاح" });
};
