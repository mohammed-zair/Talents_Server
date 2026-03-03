"use strict";

const USER_TABLE_CANDIDATES = ["users", "Users"];
const COMPANY_TABLE_CANDIDATES = ["companies", "Companies"];

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

const addSoftDeleteColumns = async (queryInterface, Sequelize, tableName, table) => {
  if (!table.is_deleted) {
    await queryInterface.addColumn(tableName, "is_deleted", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  }

  if (!table.deleted_at) {
    await queryInterface.addColumn(tableName, "deleted_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  }

  if (!table.deletion_requested_at) {
    await queryInterface.addColumn(tableName, "deletion_requested_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  }

  if (!table.deletion_reason) {
    await queryInterface.addColumn(tableName, "deletion_reason", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  }
};

const removeSoftDeleteColumns = async (queryInterface, tableName, table) => {
  if (table.deletion_reason) {
    await queryInterface.removeColumn(tableName, "deletion_reason");
  }
  if (table.deletion_requested_at) {
    await queryInterface.removeColumn(tableName, "deletion_requested_at");
  }
  if (table.deleted_at) {
    await queryInterface.removeColumn(tableName, "deleted_at");
  }
  if (table.is_deleted) {
    await queryInterface.removeColumn(tableName, "is_deleted");
  }
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const userResolved = await resolveTable(queryInterface, USER_TABLE_CANDIDATES);
    const companyResolved = await resolveTable(queryInterface, COMPANY_TABLE_CANDIDATES);

    await addSoftDeleteColumns(
      queryInterface,
      Sequelize,
      userResolved.tableName,
      userResolved.table
    );
    await addSoftDeleteColumns(
      queryInterface,
      Sequelize,
      companyResolved.tableName,
      companyResolved.table
    );

    try {
      await queryInterface.addIndex(userResolved.tableName, ["is_deleted"], {
        name: `${userResolved.tableName}_is_deleted_idx`,
      });
    } catch (_) {}
    try {
      await queryInterface.addIndex(companyResolved.tableName, ["is_deleted"], {
        name: `${companyResolved.tableName}_is_deleted_idx`,
      });
    } catch (_) {}
  },

  async down(queryInterface) {
    const userResolved = await resolveTable(queryInterface, USER_TABLE_CANDIDATES);
    const companyResolved = await resolveTable(queryInterface, COMPANY_TABLE_CANDIDATES);

    try {
      await queryInterface.removeIndex(
        userResolved.tableName,
        `${userResolved.tableName}_is_deleted_idx`
      );
    } catch (_) {}
    try {
      await queryInterface.removeIndex(
        companyResolved.tableName,
        `${companyResolved.tableName}_is_deleted_idx`
      );
    } catch (_) {}

    const freshUser = await queryInterface.describeTable(userResolved.tableName);
    const freshCompany = await queryInterface.describeTable(companyResolved.tableName);
    await removeSoftDeleteColumns(queryInterface, userResolved.tableName, freshUser);
    await removeSoftDeleteColumns(queryInterface, companyResolved.tableName, freshCompany);
  },
};

