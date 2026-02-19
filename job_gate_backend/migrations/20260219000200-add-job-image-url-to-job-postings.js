module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("JobPostings");
    if (!table.job_image_url) {
      await queryInterface.addColumn("JobPostings", "job_image_url", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("JobPostings", "job_image_url");
  },
};
