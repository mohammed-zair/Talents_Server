require("dotenv").config();

const baseConfig = {
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  dialect: "mysql",
  logging: false,
};

module.exports = {
  development: { ...baseConfig },
  production: { ...baseConfig },
  test: { ...baseConfig },
};
