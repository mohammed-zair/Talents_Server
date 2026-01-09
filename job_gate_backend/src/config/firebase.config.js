// file: src/config/firebase.config.js

const admin = require("firebase-admin");
const path = require("path");

 const serviceAccountPath = path.join(__dirname, "firebase-admin.json");
const serviceAccount = require(serviceAccountPath);

 if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;
