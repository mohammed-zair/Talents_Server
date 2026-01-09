const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");
const Company = require("./company.model"); // يفترض وجود نموذج Company

const EmailNotification = sequelize.define(
  "EmailNotification",
  {
    email_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // يمكن أن يكون الإيميل عاماً (للمسؤول)
      references: {
        model: Company,
        key: "company_id",
      },
    },
    recipient_email: {
      type: DataTypes.STRING, // الإيميل الفعلي المرسل إليه
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("sent", "failed", "pending"),
      defaultValue: "pending",
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "email_notifications",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

module.exports = EmailNotification;
