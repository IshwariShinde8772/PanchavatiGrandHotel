const app = require("./app");
const env = require("./config/env");
const { syncDatabase } = require("./bootstrap/database");

async function start() {
  try {
    await syncDatabase();
    app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
}

start();
