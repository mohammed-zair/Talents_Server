"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("users");
    if (!table.preferred_language) {
      await queryInterface.addColumn("users", "preferred_language", {
        type: Sequelize.ENUM("en", "ar"),
        allowNull: false,
        defaultValue: "en",
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("users");
    if (table.preferred_language) {
      await queryInterface.removeColumn("users", "preferred_language");
    }
    try {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_preferred_language";');
    } catch (_) {
      // no-op
    }
  },
};