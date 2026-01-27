// file: src/config/firebase.config.js

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const serviceAccountPath = path.join(__dirname, "firebase-admin.json");
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

let serviceAccount = null;

if (serviceAccountJson) {
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (error) {
    console.warn(
      "[FCM] Invalid FIREBASE_SERVICE_ACCOUNT_JSON. Falling back to file.",
      error.message || error
    );
  }
}

if (!serviceAccount && fs.existsSync(serviceAccountPath)) {
  try {
    serviceAccount = require(serviceAccountPath);
  } catch (error) {
    console.warn("[FCM] Failed to load firebase-admin.json:", error.message || error);
  }
}

if (serviceAccount && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else if (!serviceAccount) {
  console.warn(
    "[FCM] Firebase service account not configured. Push notifications are disabled."
  );
}

module.exports = admin;
