"use strict";

const CANDIDATE_TABLES = ["job_postings", "JobPostings"];

const resolveJobPostingsTable = async (queryInterface) => {
  for (const tableName of CANDIDATE_TABLES) {
    try {
      const table = await queryInterface.describeTable(tableName);
      if (table) return { tableName, table };
    } catch (_) {
      // Try next table naming style.
    }
  }
  throw new Error(
    `No description found for JobPostings table. Tried: ${CANDIDATE_TABLES.join(", ")}`
  );
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const { tableName, table } = await resolveJobPostingsTable(queryInterface);
    if (!table.is_anonymous) {
      await queryInterface.addColumn(tableName, "is_anonymous", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
  },

  async down(queryInterface) {
    const { tableName, table } = await resolveJobPostingsTable(queryInterface);
    if (table.is_anonymous) {
      await queryInterface.removeColumn(tableName, "is_anonymous");
    }
  },
};
