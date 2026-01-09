const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const CV = sequelize.define(
  "CV",
  {
    cv_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "Users", key: "user_id" },
    },
    file_url: { type: DataTypes.STRING, allowNull: true },
    file_type: { type: DataTypes.STRING, allowNull: true },
    title: { type: DataTypes.STRING, allowNull: true },
    allow_promotion: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    last_updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { tableName: "cvs", timestamps: false, underscored: true }
);

module.exports = CV;
