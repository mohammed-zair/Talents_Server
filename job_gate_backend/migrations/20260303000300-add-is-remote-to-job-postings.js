"use strict";

const TABLE_CANDIDATES = ["JobPostings", "job_postings"];

const resolveExistingTables = async (queryInterface) => {
  const allTables = await queryInterface.showAllTables();
  const normalized = allTables.map((table) =>
    typeof table === "string" ? table : table.tableName
  );
  return TABLE_CANDIDATES.filter((name) => normalized.includes(name));
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await resolveExistingTables(queryInterface);
    for (const tableName of tables) {
      await queryInterface.addColumn(tableName, "is_remote", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
  },

  async down(queryInterface) {
    const tables = await resolveExistingTables(queryInterface);
    for (const tableName of tables) {
      await queryInterface.removeColumn(tableName, "is_remote");
    }
  },
};

