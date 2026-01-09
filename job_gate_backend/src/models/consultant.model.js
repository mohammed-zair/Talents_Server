// file: src/models/consultant.model.js (النموذج المحدث)
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const Consultant = sequelize.define(
  "Consultant",
  {
    consultant_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: "Users",
        key: "user_id",
      },
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    expertise_fields: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    work_history_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    hourly_rate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    // جديد: لبيانات "عملاء عمل لهم استشارة"
    clients_served: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: "Consultants",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);
module.exports = Consultant;
