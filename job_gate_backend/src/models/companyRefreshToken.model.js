const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const CompanyRefreshToken = sequelize.define(
  "CompanyRefreshToken",
  {
    token_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    token_hash: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    login_email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    replaced_by_token_hash: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_by_ip: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "company_refresh_tokens",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    freezeTableName: true,
    primaryKey: "token_id",
  }
);

CompanyRefreshToken.removeAttribute("id");

module.exports = CompanyRefreshToken;
