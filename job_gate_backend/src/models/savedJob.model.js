 const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const SavedJob = sequelize.define("SavedJob", {
  saved_job_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  job_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

module.exports = SavedJob;
