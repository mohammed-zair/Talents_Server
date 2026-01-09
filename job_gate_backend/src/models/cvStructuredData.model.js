const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const CVStructuredData = sequelize.define(
  "CV_Structured_Data",
  {
    cv_struct_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cv_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "cvs", key: "cv_id" } },
    data_json: { type: DataTypes.JSON, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    last_updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { tableName: "cv_structured_data", timestamps: false, underscored: true }
);

module.exports = CVStructuredData;
