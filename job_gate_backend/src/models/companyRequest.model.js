const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const CompanyRequest = sequelize.define("CompanyRequest", {
  request_id: {
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

  license_doc_url: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  status: {
    type: DataTypes.ENUM("pending", "approved", "rejected"),
    defaultValue: "pending",
  },

  admin_review_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  approved_company_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },

  // 🆕 Token لمتابعة الطلب
  request_token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },

  // 🆕 صلاحية التوكن (مثلاً 7 أيام)
  token_expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },

}, {
  tableName: "company_requests",
  timestamps: true,
  // Force camelCase timestamps to match DB columns.
  underscored: false,
  createdAt: "createdAt",
  updatedAt: "updatedAt",
});

module.exports = CompanyRequest;

// const { DataTypes } = require("sequelize");
// const sequelize = require("../config/db.config");

// const CompanyRequest = sequelize.define("CompanyRequest", {
//   request_id: {
//     type: DataTypes.INTEGER,
//     primaryKey: true,
//     autoIncrement: true,
//   },
//   name: {
//     // اسم الشركة (يتم إرساله في الطلب)
//     type: DataTypes.STRING,
//     allowNull: false,
//   },
//   email: {
//     // إيميل الشركة (يتم إرساله في الطلب)
//     type: DataTypes.STRING,
//     allowNull: false,
//     unique: true, // مهم لضمان عدم تكرار البريد الإلكتروني حتى في الطلبات
//     validate: { isEmail: true },
//   },
//   phone: {
//     type: DataTypes.STRING,
//     allowNull: true,
//   },
//   license_doc_url: {
//     // إجباري
//     type: DataTypes.STRING,
//     allowNull: false,
//   },
//   status: {
//     type: DataTypes.ENUM("pending", "approved", "rejected"),
//     defaultValue: "pending",
//   },
//   admin_review_notes: {
//     type: DataTypes.TEXT,
//     allowNull: true,
//   },
//   // إذا تمت الموافقة، يمكن حفظ ID الشركة المنشأة هنا
//   approved_company_id: {
//     type: DataTypes.INTEGER,
//     allowNull: true,
//   },
// });

// module.exports = CompanyRequest;
