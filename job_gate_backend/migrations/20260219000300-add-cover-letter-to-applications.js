module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("Applications");
    if (!table.cover_letter) {
      await queryInterface.addColumn("Applications", "cover_letter", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("Applications");
    if (table.cover_letter) {
      await queryInterface.removeColumn("Applications", "cover_letter");
    }
  },
};
