const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const Application = sequelize.define("Application", {
  application_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  form_data: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("pending", "reviewed", "accepted", "rejected"),
    defaultValue: "pending",
    allowNull: false,
  },
  review_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  is_starred: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  submitted_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
 });

module.exports = Application;
