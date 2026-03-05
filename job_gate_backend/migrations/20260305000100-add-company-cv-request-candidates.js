"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("company_cv_request_candidates", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      request_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "company_cv_requests", key: "request_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      cv_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "cvs", key: "cv_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      job_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "JobPostings", key: "job_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      status: {
        type: Sequelize.ENUM(
          "selected",
          "contacting",
          "submitted_to_company",
          "accepted_by_company",
          "rejected_by_company"
        ),
        allowNull: false,
        defaultValue: "selected",
      },
      priority_rank: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      why_candidate: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      source_ai_snapshot: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_by_admin_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      updated_by_admin_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addConstraint("company_cv_request_candidates", {
      fields: ["request_id", "user_id", "cv_id"],
      type: "unique",
      name: "uq_request_user_cv",
    });

    await queryInterface.sequelize.query(
      "ALTER TABLE company_cv_requests MODIFY COLUMN status ENUM('pending','approved','rejected','processing','processed','delivered','closed') NOT NULL DEFAULT 'pending'"
    );
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint("company_cv_request_candidates", "uq_request_user_cv");
    await queryInterface.dropTable("company_cv_request_candidates");

    await queryInterface.sequelize.query(
      "ALTER TABLE company_cv_requests MODIFY COLUMN status ENUM('pending','approved','rejected','processed','delivered') NOT NULL DEFAULT 'pending'"
    );
  },
};
