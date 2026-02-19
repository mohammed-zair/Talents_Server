module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("JobPostings", "job_image_url", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("JobPostings", "job_image_url");
  },
};
