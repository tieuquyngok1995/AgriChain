/**
 * Transaction controllers for blockchain operations
 * Handles HTTP requests related to blockchain transactions
 */

import { BlockchainService } from "../services/blockchain.service.js";
import { success, sendResponse } from "../utils/response.js";
import { BlockchainError } from "../middlewares/error.middleware.js";
import { logger } from "../utils/logger.js";

/**
 * Get balance for a specific address
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getBalance = async (req, res) => {
  try {
    const { address } = req.params;

    logger.info("Getting balance for address", { address });

    const balance = await BlockchainService.getBalance(address);

    const responseData = success(
      { address, balance },
      "Balance retrieved successfully"
    );
    sendResponse(res, responseData);
  } catch (err) {
    logger.error("Error getting balance", {
      address: req.params.address,
      error: err.message,
    });

    throw new BlockchainError(
      `Failed to get balance for address: ${err.message}`,
      "BALANCE_FETCH_ERROR"
    );
  }
};
