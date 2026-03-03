const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const UserEmailOtp = sequelize.define(
  "UserEmailOtp",
  {
    otp_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    otp_hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    purpose: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "registration",
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    consumed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    tableName: "user_email_otps",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    freezeTableName: true,
    primaryKey: "otp_id",
    indexes: [
      { fields: ["email"] },
      { fields: ["email", "purpose"] },
      { fields: ["expires_at"] },
      { fields: ["verified_at"] },
      { fields: ["consumed_at"] },
    ],
  }
);

UserEmailOtp.removeAttribute("id");

module.exports = UserEmailOtp;
