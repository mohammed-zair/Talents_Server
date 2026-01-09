// file: src/models/consultationBooking.model.js

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const ConsultationBooking = sequelize.define(
  "ConsultationBooking",
  {
    booking_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    consultant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    end_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM("booked", "cancelled"),
      defaultValue: "booked",
      allowNull: false,
    },
  },
  {
    tableName: "ConsultationBookings",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = ConsultationBooking;
