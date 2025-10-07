/**
 * Startup validation script
 * Validates configuration and dependencies before server starts
 */

import dotenv from "dotenv";
import { blockchainConfig } from "../config/blockchain.js";
import { logger } from "./logger.js";

// Load environment variables
dotenv.config();

/**
 * Validate environment variables
 */
function validateEnvironment() {
  const requiredVars = ["PORT", "PRIVATE_KEY", "RPC_URL"];
  const missing = [];

  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  logger.info("Environment validation passed");
}

/**
 * Validate blockchain configuration
 */
function validateBlockchainConfig() {
  try {
    // This will throw if config is invalid
    const config = blockchainConfig;

    if (!config.privateKey || !config.rpcUrl) {
      throw new Error("Invalid blockchain configuration");
    }

    logger.info("Blockchain configuration validation passed", {
      network: config.network,
      rpcUrl: config.rpcUrl,
    });
  } catch (error) {
    throw new Error(`Blockchain configuration error: ${error.message}`);
  }
}

/**
 * Run all validations
 */
export async function validateStartup() {
  try {
    console.log("🔍 Running startup validations...\n");

    validateEnvironment();
    validateBlockchainConfig();

    console.log("✅ All validations passed! Server can start safely.\n");
    return true;
  } catch (error) {
    console.error("❌ Startup validation failed:", error.message);
    logger.error("Startup validation failed", { error: error.message });
    throw error;
  }
}

// Run validations if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateStartup();
}
