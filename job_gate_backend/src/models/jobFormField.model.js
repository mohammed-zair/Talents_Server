// file: src/models/jobFormField.model.js

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const JobFormField = sequelize.define("JobFormField", {
  field_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  // 🔑 الربط مع JobForm
  form_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  is_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },

  input_type: {
    type: DataTypes.ENUM(
      "text",
      "number",
      "email",
      "file",
      "select",
      "textarea"
    ),
    allowNull: false,
  },
});

module.exports = JobFormField;
