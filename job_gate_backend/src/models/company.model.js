const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const Company = sequelize.define(
  "Company",
  {
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

    preferred_language: {
      type: DataTypes.ENUM("en", "ar"),
      allowNull: false,
      defaultValue: "en",
    },

    logo_data: {
      type: DataTypes.BLOB("long"), // "long" لضمان مساحة كافية للصور الكبيرة
      allowNull: true,
    },

    // يفضل إضافة نوع الملف (mimetype) لتسهيل عرضه لاحقاً
    logo_mimetype: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    license_doc_data: {
      type: DataTypes.BLOB("long"),
      allowNull: false, // حسب متطلباتك السابقة
    },

    license_doc_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // حقل ضروري لمعرفة نوع الملف (مثلاً: application/pdf) عند استرجاعه
    license_mimetype: {
      type: DataTypes.STRING,
      allowNull: true,
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

    // Rejection timestamp (set when admin rejects)
    rejected_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Admin rejection reason
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Approval timestamp
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    is_approved: {
      type: DataTypes.BOOLEAN,
      defaultValue: true, // مادامت في هذا الجدول فهي معتمدة
      allowNull: false,
    },
  },
  {
    tableName: "companies",
    timestamps: true,
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    freezeTableName: true,
    primaryKey: "company_id",
  },
);

Company.removeAttribute("id");

module.exports = Company;
