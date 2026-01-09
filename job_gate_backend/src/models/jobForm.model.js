// file: src/models/jobForm.model.js

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const JobForm = sequelize.define("JobForm", {
  form_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  // 🔑 الربط مع JobPosting
  job_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  require_cv: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },

  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

module.exports = JobForm;
