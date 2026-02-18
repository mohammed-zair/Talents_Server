const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, ".env"),
  override: true,
});
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const { DataTypes } = require("sequelize");
const sequelize = require("./src/config/db.config");
const User = require("./src/models/user.model");

// Routes Imports
const authRoutes = require("./src/routes/auth.routes");
const adminRoutes = require("./src/routes/admin.routes");
const jobseekerRoutes = require("./src/routes/users.routes");
const companyRoutes = require("./src/routes/companies.routes");
const consaultantRoutes = require("./src/routes/consultant.routes");
const companyRequestsRoutes = require("./src/routes/companyRequests.routes");
const aiRoutes = require("./src/routes/ai.routes");
const pushRoutes = require("./src/routes/push.routes");
const emailRoutes = require("./src/routes/email.routes");

// CV Purchase Requests
const companyCVRequestRoutes = require("./src/routes/companyCVRequest.routes");
const adminCVRequestRoutes = require("./src/routes/companyCVRequest.admin.routes");
const adminCVMatchingRoutes = require("./src/routes/companyCVMatching.routes");

const app = express();

// Storage Folders
const uploadsDir = path.join(__dirname, "uploads");
const cvsDir = path.join(uploadsDir, "cvs");

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(cvsDir)) fs.mkdirSync(cvsDir, { recursive: true });

// Middleware
const corsOrigins = String(process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const defaultAllowedOrigins = [
  "https://talents-we-trust.tech",
  "https://admin.talents-we-trust.tech",
  "https://companies.talents-we-trust.tech",
  "https://job-seekers.talents-we-trust.tech",
];

const configuredOrigins = Array.from(
  new Set([...defaultAllowedOrigins, ...corsOrigins])
);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (configuredOrigins.includes("*")) return true;
  if (configuredOrigins.includes(origin)) return true;

  try {
    const requestUrl = new URL(origin);
    const host = requestUrl.hostname;

    // Support wildcard entries like *.talents-we-trust.tech
    const wildcardMatch = configuredOrigins.some((entry) => {
      if (!entry.startsWith("*.")) return false;
      const baseHost = entry.slice(2).toLowerCase();
      return host === baseHost || host.endsWith(`.${baseHost}`);
    });
    if (wildcardMatch) return true;

    // Always allow local development origins.
    if (host === "localhost" || host === "127.0.0.1") return true;
  } catch (_) {
    return false;
  }

  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    const error = new Error(`CORS origin denied: ${origin || "unknown origin"}`);
    error.name = "CorsOriginDeniedError";
    return callback(error);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/jop_seeker", jobseekerRoutes);
app.use("/api/consultant", consaultantRoutes);
app.use("/api/company-requests", companyRequestsRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/company/cv-requests", companyCVRequestRoutes);
app.use("/api/admin/cv-requests", adminCVRequestRoutes);
app.use("/api/admin/cv-matching", adminCVMatchingRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/email", emailRoutes);

// Health Check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "Job Gate Backend",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    ai_service_enabled: process.env.ENABLE_AI_FEATURES === "true",
    ai_service_url:
      process.env.AI_SERVICE_URL ||
      `http://localhost:${process.env.AI_SERVICE_PORT || 8000}`,
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

// Error Handler
app.use((err, req, res, next) => {
  if (err?.name === "CorsOriginDeniedError" || String(err?.message || "").includes("CORS origin denied")) {
    return res.status(403).json({
      message: "CORS policy blocked this origin.",
      origin: req.headers.origin || null,
      allowed_origins: configuredOrigins,
    });
  }

  console.error("Server Error:", err);
  res.status(500).json({
    message: "Internal server error.",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

const isProduction = process.env.NODE_ENV === "production";
const requestedForce = process.env.DB_SYNC_FORCE === "true";
const requestedAlter = process.env.DB_SYNC_ALTER === "true";

// Guard production from destructive/unstable sync behavior.
const DB_SYNC_FORCE = isProduction ? false : requestedForce;
const DB_SYNC_ALTER = isProduction ? false : requestedAlter;

if (isProduction && (requestedForce || requestedAlter)) {
  console.warn(
    "DB sync force/alter requested in production; overriding to false for safety."
  );
}

const ensureUserTypeEnum = async () => {
  const queryInterface = sequelize.getQueryInterface();
  await queryInterface.changeColumn(User.getTableName(), "user_type", {
    type: DataTypes.ENUM("admin", "seeker", "consultant", "company"),
    allowNull: false,
    defaultValue: "seeker",
  });
};

sequelize
  .sync({ force: DB_SYNC_FORCE, alter: DB_SYNC_ALTER })
  .then(async () => {
    await ensureUserTypeEnum();
    console.log("Database synced successfully");

    if (process.env.ENABLE_AI_FEATURES === "true") {
      console.log("AI Features: Enabled");
      console.log(
        `AI Service URL: ${
          process.env.AI_SERVICE_URL || "http://localhost:8000"
        }`
      );
    } else {
      console.log("AI Features: Disabled");
    }
  })
  .catch((err) => {
    console.error("Database sync failed:", err);
    process.exit(1);
  });

module.exports = app;
