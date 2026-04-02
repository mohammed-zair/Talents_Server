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
  analysis_status: {
    type: DataTypes.ENUM("not_requested", "pending", "succeeded", "failed"),
    allowNull: false,
    defaultValue: "not_requested",
  },
  analysis_error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  analysis_started_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  analysis_completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  analysis_retry_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  analysis_source: {
    type: DataTypes.ENUM("cv_lab", "application_upload"),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM(
      "pending",
      "reviewed",
      "shortlisted",
      "accepted",
      "hired",
      "rejected"
    ),
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
