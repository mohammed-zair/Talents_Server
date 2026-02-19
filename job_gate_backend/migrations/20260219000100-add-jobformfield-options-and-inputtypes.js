"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("JobFormFields", "options", {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: [],
    });

    await queryInterface.changeColumn("JobFormFields", "input_type", {
      type: Sequelize.ENUM(
        "text",
        "number",
        "email",
        "file",
        "select",
        "textarea",
        "checkbox",
        "radio"
      ),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("JobFormFields", "input_type", {
      type: Sequelize.ENUM(
        "text",
        "number",
        "email",
        "file",
        "select",
        "textarea"
      ),
      allowNull: false,
    });

    await queryInterface.removeColumn("JobFormFields", "options");
  },
};
