const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const CVAIInsights = sequelize.define(
  "CVAIInsights",
  {
    insight_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    cv_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    job_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ai_intelligence: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
    structured_data: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    features_analytics: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    ai_raw_response: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    ats_score: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    industry_ranking_score: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    industry_ranking_label: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cleaned_job_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    analysis_method: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "cv_ai_insights",
    timestamps: false,
  }
);

module.exports = CVAIInsights;
