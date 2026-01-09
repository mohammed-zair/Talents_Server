const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const CVFeaturesAnalytics = sequelize.define(
  "CV_Features_Analytics",
  {
    analytics_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cv_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "CVs", key: "cv_id" } },
    ats_score: { type: DataTypes.FLOAT, defaultValue: 0 },
    total_years_experience: { type: DataTypes.FLOAT, defaultValue: 0 },
    key_skills: { type: DataTypes.JSON, defaultValue: [] },
    achievement_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    has_contact_info: { type: DataTypes.BOOLEAN, defaultValue: false },
    has_education: { type: DataTypes.BOOLEAN, defaultValue: false },
    has_experience: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_ats_compliant: { type: DataTypes.BOOLEAN, defaultValue: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    last_updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { tableName: "cv_features_analytics", timestamps: false, underscored: true }
);

module.exports = CVFeaturesAnalytics;
