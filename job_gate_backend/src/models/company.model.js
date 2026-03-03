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
      type: DataTypes.BLOB("long"),
      allowNull: true,
    },

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
      allowNull: false,
    },

    license_doc_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    license_mimetype: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    password_set_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    set_password_token: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },

    set_password_expires: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    rejected_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    is_approved: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },

    is_deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    deletion_requested_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    deletion_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "companies",
    timestamps: true,
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    freezeTableName: true,
    primaryKey: "company_id",
  }
);

Company.removeAttribute("id");

module.exports = Company;
