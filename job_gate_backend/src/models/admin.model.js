const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const Admin = sequelize.define("Admin", {
  admin_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  full_name: { type: DataTypes.STRING, unique: true, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  hashed_password: { type: DataTypes.STRING, allowNull: false },
});

module.exports = Admin;
