module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable("cv_ai_insights");

    if (!table.structured_data) {
      await queryInterface.addColumn("cv_ai_insights", "structured_data", {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }

    if (!table.features_analytics) {
      await queryInterface.addColumn("cv_ai_insights", "features_analytics", {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }

    if (!table.ai_raw_response) {
      await queryInterface.addColumn("cv_ai_insights", "ai_raw_response", {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable("cv_ai_insights");

    if (table.structured_data) {
      await queryInterface.removeColumn("cv_ai_insights", "structured_data");
    }

    if (table.features_analytics) {
      await queryInterface.removeColumn("cv_ai_insights", "features_analytics");
    }

    if (table.ai_raw_response) {
      await queryInterface.removeColumn("cv_ai_insights", "ai_raw_response");
    }
  },
};
