/**
 * AgriChain routes for agricultural data traceability
 * Defines API endpoints for blockchain-based agricultural data operations
 */

import express from "express";
import {
  storeAgriDataController,
  retrieveAgriDataController,
  verifyAgriDataController,
  getHistoryController,
  getFarmerHistoryController,
  searchAgriDataController,
} from "../controllers/agrichain.controller.js";
import { HashService } from "../services/hash.service.js";
import { success, sendResponse } from "../utils/response.js";
import { BlockchainError } from "../middlewares/error.middleware.js";
import {
  validateRequiredFields,
  validateTransactionHash,
  validateString,
  validateNumber,
  asyncHandler,
  blockchainRateLimiter,
  strictRateLimiter,
} from "../middlewares/index.js";

const router = express.Router();

// Store agricultural data on blockchain with database integration
router.post(
  "/store",
  blockchainRateLimiter,
  validateRequiredFields([
    "farmerId",
    "productType",
    "harvestDate",
    "location",
  ]),
  validateString("farmerId", { minLength: 3, maxLength: 50 }),
  validateString("productType", { minLength: 2, maxLength: 30 }),
  validateString("location", { minLength: 5, maxLength: 100 }),
  asyncHandler(storeAgriDataController)
);

// Retrieve agricultural data from database/blockchain by hash
router.get("/retrieve/:identifier", asyncHandler(retrieveAgriDataController));

// Retrieve agricultural data by ID or hash with type specification
router.get(
  "/retrieve/:identifier/:type",
  asyncHandler(retrieveAgriDataController)
);

// Verify agricultural data integrity with database logging
router.post(
  "/verify",
  validateRequiredFields(["originalData", "identifier"]),
  asyncHandler(verifyAgriDataController)
);

// Get agricultural data history from database
router.get(
  "/history",
  validateNumber("limit", { min: 1, max: 50, required: false }),
  validateNumber("offset", { min: 0, required: false }),
  asyncHandler(getHistoryController)
);

// Get farmer's agricultural data history and statistics
router.get(
  "/farmer/:farmerId/history",
  validateString("farmerId", { minLength: 3, maxLength: 50 }),
  validateNumber("limit", { min: 1, max: 50, required: false }),
  asyncHandler(getFarmerHistoryController)
);

// Search agricultural data with filters
router.get("/search", asyncHandler(searchAgriDataController));

// Generate hash for data (utility endpoint)
router.post(
  "/hash",
  validateRequiredFields(["data"]),
  asyncHandler(async (req, res) => {
    try {
      const { data } = req.body;
      const hashResult = HashService.createAgriDataHash(data);
      const responseData = success(
        { hash: hashResult.hash, originalData: hashResult.data },
        "Hash generated successfully"
      );
      sendResponse(res, responseData);
    } catch (err) {
      throw new BlockchainError(`Failed to generate hash: ${err.message}`);
    }
  })
);

// Get AgriChain service status
router.get(
  "/status",
  asyncHandler(async (req, res) => {
    const { BlockchainService } = await import(
      "../services/blockchain.service.js"
    );

    try {
      const networkInfo = await BlockchainService.getNetworkInfo();
      const walletAddress = BlockchainService.getWalletAddress();
      const balance = await BlockchainService.getBalance(walletAddress);

      res.json({
        success: true,
        message: "AgriChain service is operational",
        status: {
          blockchain: {
            connected: true,
            network: networkInfo.name,
            chainId: networkInfo.chainId,
            rpcUrl: networkInfo.rpcUrl,
          },
          wallet: {
            address: walletAddress,
            balance: balance + " ETH",
          },
          services: {
            hashGeneration: "active",
            blockchainStorage: "active",
            dataVerification: "active",
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        message: "AgriChain service partially unavailable",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  })
);

export default router;
