/**
 * Hash service for AgriChain data integrity
 * Handles SHA-256 hash generation and blockchain storage
 */

import crypto from "crypto";
import { logger } from "../utils/logger.js";

/**
 * Generate SHA-256 hash from data
 * @param {Object|string} data - Data to hash
 * @returns {string} - SHA-256 hash
 */
export const generateHash = (data) => {
  try {
    // Convert object to string if needed
    const dataString =
      typeof data === "object" ? JSON.stringify(data) : String(data);

    // Generate SHA-256 hash
    const hash = crypto
      .createHash("sha256")
      .update(dataString, "utf8")
      .digest("hex");

    logger.info("Hash generated successfully", {
      dataLength: dataString.length,
      hash: hash.substring(0, 10) + "...", // Log partial hash for security
    });

    return `0x${hash}`;
  } catch (error) {
    logger.error("Failed to generate hash", { error: error.message });
    throw new Error(`Hash generation failed: ${error.message}`);
  }
};

/**
 * Verify data against hash
 * @param {Object|string} data - Original data
 * @param {string} hash - Hash to verify against
 * @returns {boolean} - True if data matches hash
 */
export const verifyHash = (data, hash) => {
  try {
    const generatedHash = generateHash(data);
    const cleanHash = hash.startsWith("0x") ? hash : `0x${hash}`;

    const isValid = generatedHash === cleanHash;

    logger.info("Hash verification completed", {
      isValid,
      originalHash: cleanHash.substring(0, 10) + "...",
      generatedHash: generatedHash.substring(0, 10) + "...",
    });

    return isValid;
  } catch (error) {
    logger.error("Hash verification failed", { error: error.message });
    return false;
  }
};

/**
 * Create agricultural data hash
 * @param {Object} agriData - Agricultural data object
 * @returns {Object} - Hash and metadata
 */
export const createAgriDataHash = (agriData) => {
  try {
    // Validate required fields
    const requiredFields = [
      "farmerId",
      "productType",
      "harvestDate",
      "location",
    ];
    const missingFields = requiredFields.filter((field) => !agriData[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }

    // Add timestamp and version
    const dataWithMetadata = {
      ...agriData,
      timestamp: new Date().toISOString(),
      version: "1.0",
      system: "AgriChain",
    };

    const hash = generateHash(dataWithMetadata);

    logger.info("Agricultural data hash created", {
      farmerId: agriData.farmerId,
      productType: agriData.productType,
      hash: hash.substring(0, 10) + "...",
    });

    return {
      hash,
      data: dataWithMetadata,
      fields: Object.keys(dataWithMetadata),
      size: JSON.stringify(dataWithMetadata).length,
    };
  } catch (error) {
    logger.error("Failed to create agricultural data hash", {
      error: error.message,
    });
    throw error;
  }
};

export const HashService = {
  generateHash,
  verifyHash,
  createAgriDataHash,
};
