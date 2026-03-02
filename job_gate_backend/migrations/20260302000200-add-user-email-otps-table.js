"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "user_email_otps";

    const hasTable = async () => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch (_) {
        return false;
      }
    };

    if (!(await hasTable())) {
      await queryInterface.createTable(tableName, {
        otp_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        email: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        otp_hash: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        expires_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        verified_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        consumed_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        attempts: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        created_by_ip: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        user_agent: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
      });
    }

    const existingIndexes = await queryInterface.showIndex(tableName);
    const indexNames = new Set(existingIndexes.map((idx) => idx.name));
    const existingSignatures = new Set(
      existingIndexes.map((idx) =>
        (idx.fields || [])
          .map((f) => f.attribute || f.name)
          .filter(Boolean)
          .join("|")
      )
    );
    const ensureIndex = async (columns) => {
      const name = `${tableName}_${columns.join("_")}`;
      const signature = columns.join("|");
      if (indexNames.has(name) || existingSignatures.has(signature)) return;
      await queryInterface.addIndex(tableName, columns, { name });
      indexNames.add(name);
      existingSignatures.add(signature);
    };

    await ensureIndex(["email"]);
    await ensureIndex(["expires_at"]);
    await ensureIndex(["verified_at"]);
    await ensureIndex(["consumed_at"]);
  },

  async down(queryInterface) {
    const tableName = "user_email_otps";
    try {
      await queryInterface.describeTable(tableName);
      await queryInterface.dropTable(tableName);
    } catch (_) {
      // no-op if table does not exist
    }
  },
};
