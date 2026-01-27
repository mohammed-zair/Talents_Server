const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const CompanyUser = sequelize.define(
  "CompanyUser",
  {
    company_user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "companies", key: "company_id" },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    hashed_password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
  },
  {
    tableName: "company_users",
    timestamps: true,
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    freezeTableName: true,
  }
);

CompanyUser.removeAttribute("id");

module.exports = CompanyUser;
