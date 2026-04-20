const { sequelize } = require("../models");
const { syncDatabase } = require("../src/bootstrap/database");
const env = require("../src/config/env");

async function resetDatabase() {
  try {
    console.log("Resetting database and rebuilding all tables from Sequelize models...");
    await syncDatabase({ force: true, alter: false });
    console.log("Database reset complete.");
    console.log(`Admin bootstrap: ${env.defaultAdmin.email} / ${env.defaultAdmin.password}`);
    console.log("Dummy logins remain available on demand:");
    console.log("  admin@dummy.com / anypassword");
    console.log("  receptionist@dummy.com / anypassword");
    console.log("  customer@dummy.com / anypassword");
  } catch (error) {
    console.error("Reset failed:", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

resetDatabase();

/*
const { Sequelize } = require("sequelize");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
    logging: false,
  }
);

async function resetDatabase() {
  try {
    console.log("🛠️  Panchavati Grand: Starting Database Reset...");
    
    // Read SQL file
    const sqlPath = path.join(__dirname, "../init_db.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    // Split by semicolon but ignore comments and empty lines
    const queries = sql
      .split(";")
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith("--"));

    console.log(`📡 Executing ${queries.length} initialization queries...`);

    for (const query of queries) {
      await sequelize.query(query);
    }

    console.log("✅ Database reset successfully! All dummy data cleared.");
    console.log("🔑 Default Credentials:");
    console.log("   Admin: admin@panchavatgrand.in / password123");
    console.log("   Receptionist: receptionist@dummy.com / (Auto-created on login)");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Reset failed:", error);
    process.exit(1);
  }
}

resetDatabase();
*/
