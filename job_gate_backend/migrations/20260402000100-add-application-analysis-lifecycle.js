"use strict";

const resolveExistingTableName = async (queryInterface, candidates) => {
  const tables = await queryInterface.showAllTables();
  const normalized = tables.map((table) =>
    typeof table === "string" ? table : table.tableName || table.name
  );

  for (const candidate of candidates) {
    if (normalized.includes(candidate)) {
      return candidate;
    }
  }

  throw new Error(`None of the expected tables exist: ${candidates.join(", ")}`);
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const applicationsTable = await resolveExistingTableName(queryInterface, [
      "Applications",
      "applications",
    ]);
    const cvsTable = await resolveExistingTableName(queryInterface, ["cvs", "CVs"]);

    await queryInterface.addColumn(applicationsTable, "analysis_status", {
      type: Sequelize.ENUM("not_requested", "pending", "succeeded", "failed"),
      allowNull: false,
      defaultValue: "not_requested",
    });

    await queryInterface.addColumn(applicationsTable, "analysis_error_message", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn(applicationsTable, "analysis_started_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn(applicationsTable, "analysis_completed_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn(applicationsTable, "analysis_retry_count", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn(applicationsTable, "analysis_source", {
      type: Sequelize.ENUM("cv_lab", "application_upload"),
      allowNull: true,
    });

    await queryInterface.addColumn(cvsTable, "cv_source", {
      type: Sequelize.ENUM("cv_lab", "application_upload"),
      allowNull: false,
      defaultValue: "cv_lab",
    });
  },

  async down(queryInterface) {
    const applicationsTable = await resolveExistingTableName(queryInterface, [
      "Applications",
      "applications",
    ]);
    const cvsTable = await resolveExistingTableName(queryInterface, ["cvs", "CVs"]);

    await queryInterface.removeColumn(cvsTable, "cv_source");
    await queryInterface.removeColumn(applicationsTable, "analysis_source");
    await queryInterface.removeColumn(applicationsTable, "analysis_retry_count");
    await queryInterface.removeColumn(applicationsTable, "analysis_completed_at");
    await queryInterface.removeColumn(applicationsTable, "analysis_started_at");
    await queryInterface.removeColumn(applicationsTable, "analysis_error_message");
    await queryInterface.removeColumn(applicationsTable, "analysis_status");
  },
};
