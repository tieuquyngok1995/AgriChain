/**
 * AgriChain Server Entry Point
 * Handles server startup with proper validation and error handling
 */

import app from "./src/app.js";
import { config } from "./src/config/index.js";
import { validateStartup } from "./src/utils/startup-validator.js";
import { logger } from "./src/utils/logger.js";

/**
 * Start server with validation
 */
async function startServer() {
  try {
    // Run startup validations
    await validateStartup();

    // Start the server
    const server = app.listen(config.PORT, () => {
      console.log(`🚀 AgriChain Server running on port ${config.PORT}`);
      console.log(`📍 Environment: ${config.NODE_ENV}`);
      console.log(
        `🔗 Health check: http://localhost:${config.PORT}/api/health`
      );
      console.log(`📚 API docs: http://localhost:${config.PORT}/api`);

      logger.info("Server started successfully", {
        port: config.PORT,
        environment: config.NODE_ENV,
      });
    });

    // Handle graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n📴 Received ${signal}. Starting graceful shutdown...`);

      server.close(() => {
        console.log("🛑 Server closed successfully");
        logger.info("Server shutdown completed");
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.log("⚠️ Forcing shutdown...");
        process.exit(1);
      }, 10000);
    };

    // Listen for shutdown signals
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    logger.error("Server startup failed", { error: error.message });
    process.exit(1);
  }
}

// Start the server
startServer();
