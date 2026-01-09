const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");
const User = require("./user.model"); // يفترض وجود نموذج User

const PushNotification = sequelize.define(
  "PushNotification",
  {
    push_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "user_id",
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    is_sent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "push_notifications",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

module.exports = PushNotification;
