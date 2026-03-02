"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("companies");
    if (!table.preferred_language) {
      await queryInterface.addColumn("companies", "preferred_language", {
        type: Sequelize.ENUM("en", "ar"),
        allowNull: false,
        defaultValue: "en",
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("companies");
    if (table.preferred_language) {
      await queryInterface.removeColumn("companies", "preferred_language");
    }
    // Best-effort cleanup for Postgres enum type; ignored by dialects that do not create it.
    try {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_companies_preferred_language";');
    } catch (_) {
      // no-op
    }
  },
};
