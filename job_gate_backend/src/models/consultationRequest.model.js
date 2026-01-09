// file: src/models/consultationRequest.model.js

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const ConsultationRequest = sequelize.define(
  "ConsultationRequest",
  {
    request_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    consultant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    requester_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM("pending", "accepted", "rejected"),
      defaultValue: "pending",
      allowNull: false,
    },
  },
  {
    tableName: "ConsultationRequests",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = ConsultationRequest;
