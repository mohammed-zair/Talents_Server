"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("applications", "analysis_status", {
      type: Sequelize.ENUM("not_requested", "pending", "succeeded", "failed"),
      allowNull: false,
      defaultValue: "not_requested",
    });

    await queryInterface.addColumn("applications", "analysis_error_message", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("applications", "analysis_started_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("applications", "analysis_completed_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("applications", "analysis_retry_count", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn("applications", "analysis_source", {
      type: Sequelize.ENUM("cv_lab", "application_upload"),
      allowNull: true,
    });

    await queryInterface.addColumn("cvs", "cv_source", {
      type: Sequelize.ENUM("cv_lab", "application_upload"),
      allowNull: false,
      defaultValue: "cv_lab",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("cvs", "cv_source");
    await queryInterface.removeColumn("applications", "analysis_source");
    await queryInterface.removeColumn("applications", "analysis_retry_count");
    await queryInterface.removeColumn("applications", "analysis_completed_at");
    await queryInterface.removeColumn("applications", "analysis_started_at");
    await queryInterface.removeColumn("applications", "analysis_error_message");
    await queryInterface.removeColumn("applications", "analysis_status");
  },
};
