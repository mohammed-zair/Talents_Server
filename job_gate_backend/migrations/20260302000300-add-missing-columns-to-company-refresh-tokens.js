"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "company_refresh_tokens";
    const table = await queryInterface.describeTable(tableName);

    if (!table.login_email) {
      await queryInterface.addColumn(tableName, "login_email", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!table.replaced_by_token_hash) {
      await queryInterface.addColumn(tableName, "replaced_by_token_hash", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!table.created_by_ip) {
      await queryInterface.addColumn(tableName, "created_by_ip", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!table.user_agent) {
      await queryInterface.addColumn(tableName, "user_agent", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const tableName = "company_refresh_tokens";
    const table = await queryInterface.describeTable(tableName);

    if (table.user_agent) {
      await queryInterface.removeColumn(tableName, "user_agent");
    }
    if (table.created_by_ip) {
      await queryInterface.removeColumn(tableName, "created_by_ip");
    }
    if (table.replaced_by_token_hash) {
      await queryInterface.removeColumn(tableName, "replaced_by_token_hash");
    }
    if (table.login_email) {
      await queryInterface.removeColumn(tableName, "login_email");
    }
  },
};

