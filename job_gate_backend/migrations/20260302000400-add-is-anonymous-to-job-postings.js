"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("job_postings");
    if (!table.is_anonymous) {
      await queryInterface.addColumn("job_postings", "is_anonymous", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("job_postings");
    if (table.is_anonymous) {
      await queryInterface.removeColumn("job_postings", "is_anonymous");
    }
  },
};

