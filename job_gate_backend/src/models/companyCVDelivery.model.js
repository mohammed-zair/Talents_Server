const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const CompanyCVDelivery = sequelize.define(
  "CompanyCVDelivery",
  {
    delivery_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    request_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    cv_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    match_score: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    match_details: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    delivered_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "company_cv_deliveries",
    timestamps: false,
    underscored: true,
  }
);

module.exports = CompanyCVDelivery;
