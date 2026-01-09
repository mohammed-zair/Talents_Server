const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");
const Company = require("./company.model");

const CompanyCVRequest = sequelize.define(
  "CompanyCVRequest",
  {
    request_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Company, key: "company_id" },
      onDelete: "CASCADE",
    },
    requested_role: { type: DataTypes.STRING, allowNull: false },
    experience_years: { type: DataTypes.FLOAT, allowNull: true },
    skills: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
    location: { type: DataTypes.STRING, allowNull: true },
    cv_count: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "processed", "delivered"),
      defaultValue: "pending",
      allowNull: false,
    },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "company_cv_requests",
    timestamps: false,
    underscored: true,
  }
);

module.exports = CompanyCVRequest;
