const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const CompanyCVRequestCandidate = sequelize.define(
  "CompanyCVRequestCandidate",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    request_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    cv_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    job_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        "selected",
        "contacting",
        "submitted_to_company",
        "accepted_by_company",
        "rejected_by_company"
      ),
      allowNull: false,
      defaultValue: "selected",
    },
    priority_rank: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    why_candidate: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    source_ai_snapshot: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_by_admin_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    updated_by_admin_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "company_cv_request_candidates",
    timestamps: false,
    underscored: true,
  }
);

module.exports = CompanyCVRequestCandidate;
