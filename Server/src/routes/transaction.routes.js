/**
 * Transaction routes for blockchain operations
 * Defines API endpoints for transaction-related functionality
 */

import express from "express";
import { getBalance } from "../controllers/transaction.controller.js";
import {
  validateEthereumAddress,
  asyncHandler,
  blockchainRateLimiter,
} from "../middlewares/index.js";

const router = express.Router();

// Get balance for an Ethereum address
router.get(
  "/balance/:address",
  blockchainRateLimiter,
  validateEthereumAddress("address"),
  asyncHandler(getBalance)
);

export default router;
