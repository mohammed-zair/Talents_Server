const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const Company = sequelize.define("Company", {
  company_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },

  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  logo_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  license_doc_url: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  // 🆕 كلمة مرور الشركة (مشفّرة)
  password: {
    type: DataTypes.STRING,
    allowNull: true, // null إلى أن يتم القبول وتعيين كلمة مرور
  },

  // 🆕 تاريخ تعيين كلمة المرور (اختياري – مفيد للأمان)
  password_set_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  // 🆕 token لتعيين كلمة المرور (أول مرة)
  set_password_token: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },

  // 🆕 صلاحية token تعيين كلمة المرور
  set_password_expires: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  is_approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: true, // مادامت في هذا الجدول فهي معتمدة
    allowNull: false,
  },
}, {
  tableName: "companies",
  timestamps: true,
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  freezeTableName: true,
  primaryKey: "company_id",
});

Company.removeAttribute("id");

module.exports = Company;
 
