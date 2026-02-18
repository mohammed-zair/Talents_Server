const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const User = sequelize.define("User", {
  user_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  full_name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  hashed_password: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING },
  user_type: {
    type: DataTypes.ENUM("admin", "seeker", "consultant", "company"),
    defaultValue: "seeker",
  },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  profile_completed: { type: DataTypes.BOOLEAN, defaultValue: false },
  fcm_token: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  reset_password_token: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  reset_password_expires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  reset_password_sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

module.exports = User;

// const { DataTypes } = require("sequelize");
// const sequelize = require("../config/db.config");

// const User = sequelize.define("User", {
//   user_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
//   full_name: { type: DataTypes.STRING, allowNull: false },
//   email: { type: DataTypes.STRING, unique: true, allowNull: false },
//   hashed_password: { type: DataTypes.STRING, allowNull: false },
//   phone: { type: DataTypes.STRING },
//   user_type: {
//     type: DataTypes.ENUM("admin", "seeker"),
//     defaultValue: "seeker",
//   },
//   is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
//   profile_completed: { type: DataTypes.BOOLEAN, defaultValue: false },
//   fcm_token: {
//     type: DataTypes.TEXT,
//     allowNull: true,
//   },
// });

// module.exports = User;
