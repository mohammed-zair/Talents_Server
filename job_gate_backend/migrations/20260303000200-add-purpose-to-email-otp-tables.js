"use strict";

const USER_OTP_TABLE_CANDIDATES = ["user_email_otps", "UserEmailOtps"];
const COMPANY_OTP_TABLE_CANDIDATES = ["company_email_otps", "CompanyEmailOtps"];

const resolveTable = async (queryInterface, candidates) => {
  for (const tableName of candidates) {
    try {
      const table = await queryInterface.describeTable(tableName);
      if (table) return { tableName, table };
    } catch (_) {
      // Try next candidate.
    }
  }
  throw new Error(`No description found for tables: ${candidates.join(", ")}`);
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const userOtp = await resolveTable(queryInterface, USER_OTP_TABLE_CANDIDATES);
    const companyOtp = await resolveTable(queryInterface, COMPANY_OTP_TABLE_CANDIDATES);

    if (!userOtp.table.purpose) {
      await queryInterface.addColumn(userOtp.tableName, "purpose", {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "registration",
      });
    }

    if (!companyOtp.table.purpose) {
      await queryInterface.addColumn(companyOtp.tableName, "purpose", {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "registration",
      });
    }

    try {
      await queryInterface.addIndex(userOtp.tableName, ["email", "purpose"], {
        name: `${userOtp.tableName}_email_purpose_idx`,
      });
    } catch (_) {}

    try {
      await queryInterface.addIndex(companyOtp.tableName, ["email", "purpose"], {
        name: `${companyOtp.tableName}_email_purpose_idx`,
      });
    } catch (_) {}
  },

  async down(queryInterface) {
    const userOtp = await resolveTable(queryInterface, USER_OTP_TABLE_CANDIDATES);
    const companyOtp = await resolveTable(queryInterface, COMPANY_OTP_TABLE_CANDIDATES);
    const userTable = await queryInterface.describeTable(userOtp.tableName);
    const companyTable = await queryInterface.describeTable(companyOtp.tableName);

    try {
      await queryInterface.removeIndex(
        userOtp.tableName,
        `${userOtp.tableName}_email_purpose_idx`
      );
    } catch (_) {}

    try {
      await queryInterface.removeIndex(
        companyOtp.tableName,
        `${companyOtp.tableName}_email_purpose_idx`
      );
    } catch (_) {}

    if (userTable.purpose) {
      await queryInterface.removeColumn(userOtp.tableName, "purpose");
    }
    if (companyTable.purpose) {
      await queryInterface.removeColumn(companyOtp.tableName, "purpose");
    }
  },
};

