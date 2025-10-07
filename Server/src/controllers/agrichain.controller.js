// AgriChain controllers for agricultural data traceability
// Handles HTTP requests for storing and retrieving agricultural data with database integration

import { AgriChainService } from "../services/agrichain.service.js";
import { success, sendResponse } from "../utils/response.js";
import {
  BlockchainError,
  ValidationError,
} from "../middlewares/error.middleware.js";
import { logger } from "../utils/logger.js";

// Store agricultural data
export const storeAgriDataController = async (req, res) => {
  try {
    logger.info("Store agricultural data request received", {
      farmerId: req.body.farmerId,
      filesCount: req.files?.length || 0,
      ip: req.ip,
    });

    const agriData = req.body;
    const files = req.files || [];
    const result = await AgriChainService.storeAgriData(agriData, files);

    const responseData = success(
      result,
      "Agricultural data stored successfully"
    );

    logger.info("Agricultural data stored successfully", {
      dataId: result.dataId,
      farmerId: agriData.farmerId,
      hash: result.dataHash?.substring(0, 10) + "...",
    });

    sendResponse(res, responseData);
  } catch (err) {
    logger.error("Failed to store agricultural data", {
      farmerId: req.body?.farmerId,
      error: err.message,
      ip: req.ip,
    });
    throw new BlockchainError(
      `Failed to store agricultural data: ${err.message}`
    );
  }
};

// Retrieve agricultural data
export const retrieveAgriDataController = async (req, res) => {
  try {
    const { identifier, type = "hash" } = req.params;

    logger.info("Retrieve agricultural data request", {
      identifier:
        type === "hash" ? identifier.substring(0, 10) + "..." : identifier,
      type,
      ip: req.ip,
    });

    const result = await AgriChainService.retrieveAgriData(identifier, type);

    const responseData = success(
      result,
      "Agricultural data retrieved successfully"
    );

    logger.info("Agricultural data retrieved successfully", {
      dataId: result.dataId,
      farmerId: result.farmerId,
      type,
    });

    sendResponse(res, responseData);
  } catch (err) {
    logger.error("Failed to retrieve agricultural data", {
      identifier:
        type === "hash" ? identifier?.substring(0, 10) + "..." : identifier,
      type,
      error: err.message,
      ip: req.ip,
    });
    throw new BlockchainError(
      `Failed to retrieve agricultural data: ${err.message}`
    );
  }
};

// Verify agricultural data integrity
export const verifyAgriDataController = async (req, res) => {
  try {
    const { originalData, identifier, type = "hash" } = req.body;

    logger.info("Data integrity verification request", {
      identifier:
        type === "hash" ? identifier?.substring(0, 10) + "..." : identifier,
      type,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    const result = await AgriChainService.verifyAgriDataIntegrity(
      originalData,
      identifier,
      type,
      {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      }
    );

    const responseData = success(
      result,
      "Data integrity verification completed"
    );

    logger.info("Data integrity verification completed", {
      dataId: result.dataId,
      isValid: result.verification?.isValid,
      status: result.status,
    });

    sendResponse(res, responseData);
  } catch (err) {
    logger.error("Data verification failed", {
      identifier: req.body.identifier,
      error: err.message,
      ip: req.ip,
    });
    throw new ValidationError(`Data verification failed: ${err.message}`);
  }
};

// Get history
export const getHistoryController = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    logger.info("Get agricultural data history request", {
      limit,
      offset,
      ip: req.ip,
    });

    const result = await AgriChainService.getAgriDataHistory(limit, offset);

    const responseData = success(result, "History retrieved successfully");

    logger.info("Agricultural data history retrieved", {
      count: result.count,
      limit,
      offset,
    });

    sendResponse(res, responseData);
  } catch (err) {
    logger.error("Failed to get history", {
      limit: req.query.limit,
      offset: req.query.offset,
      error: err.message,
      ip: req.ip,
    });
    throw new BlockchainError(`Failed to get history: ${err.message}`);
  }
};

// Get farmer history
export const getFarmerHistoryController = async (req, res) => {
  try {
    const { farmerId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    logger.info("Get farmer history request", {
      farmerId,
      limit,
      ip: req.ip,
    });

    const result = await AgriChainService.getFarmerHistory(farmerId, limit);

    const responseData = success(
      result,
      "Farmer history retrieved successfully"
    );

    logger.info("Farmer history retrieved successfully", {
      farmerId,
      totalRecords: result.totalRecords,
      recordsReturned: result.dataHistory?.length,
    });

    sendResponse(res, responseData);
  } catch (err) {
    logger.error("Failed to get farmer history", {
      farmerId: req.params.farmerId,
      error: err.message,
      ip: req.ip,
    });
    throw new BlockchainError(`Failed to get farmer history: ${err.message}`);
  }
};

// Search agricultural data
export const searchAgriDataController = async (req, res) => {
  try {
    const filters = { ...req.query };
    if (filters.limit) filters.limit = parseInt(filters.limit);
    if (filters.offset) filters.offset = parseInt(filters.offset);

    logger.info("Search agricultural data request", {
      filters: Object.keys(filters),
      filtersCount: Object.keys(filters).length,
      ip: req.ip,
    });

    const result = await AgriChainService.searchAgriData(filters);

    const responseData = success(result, "Search completed successfully");

    logger.info("Agricultural data search completed", {
      filtersApplied: Object.keys(filters).length,
      resultsFound: result.totalFound,
    });

    sendResponse(res, responseData);
  } catch (err) {
    logger.error("Search failed", {
      filters: req.query,
      error: err.message,
      ip: req.ip,
    });
    throw new BlockchainError(`Search failed: ${err.message}`);
  }
};

// FileController for file upload functionality
export const FileController = {
  // Store agricultural data with files
  storeWithFiles: async (req, res) => {
    try {
      logger.info("Store agricultural data with files request", {
        farmerId: req.body.farmerId,
        filesCount: req.files?.length || 0,
        ip: req.ip,
      });

      const agriData = req.body;
      const files = req.files || [];
      const result = await AgriChainService.storeAgriData(agriData, files);

      const responseData = success(
        result,
        "Agricultural data with files stored successfully"
      );

      logger.info("Agricultural data with files stored successfully", {
        dataId: result.dataId,
        filesStored: files.length,
      });

      sendResponse(res, responseData);
    } catch (err) {
      logger.error("Failed to store agricultural data with files", {
        error: err.message,
        ip: req.ip,
      });
      throw new BlockchainError(
        `Failed to store agricultural data with files: ${err.message}`
      );
    }
  },

  // Store agricultural data without files (text only)
  storeTextOnly: async (req, res) => {
    try {
      logger.info("Store agricultural data (text only) request", {
        farmerId: req.body.farmerId,
        ip: req.ip,
      });

      const agriData = req.body;
      const result = await AgriChainService.storeAgriData(agriData, []);

      const responseData = success(
        result,
        "Agricultural data (text only) stored successfully"
      );

      logger.info("Agricultural data (text only) stored successfully", {
        dataId: result.dataId,
        farmerId: agriData.farmerId,
      });

      sendResponse(res, responseData);
    } catch (err) {
      logger.error("Failed to store agricultural data (text only)", {
        error: err.message,
        ip: req.ip,
      });
      throw new BlockchainError(
        `Failed to store agricultural data: ${err.message}`
      );
    }
  },

  // Retrieve agricultural data by transaction hash
  retrieveData: async (req, res) => {
    try {
      const { transactionHash } = req.params;

      logger.info("Retrieve agricultural data by hash request", {
        transactionHash: transactionHash.substring(0, 10) + "...",
        ip: req.ip,
      });

      const result = await AgriChainService.retrieveAgriData(
        transactionHash,
        "hash"
      );

      const responseData = success(
        result,
        "Agricultural data retrieved successfully"
      );

      logger.info("Agricultural data retrieved by hash successfully", {
        dataId: result.dataId,
        farmerId: result.farmerId,
      });

      sendResponse(res, responseData);
    } catch (err) {
      logger.error("Failed to retrieve agricultural data by hash", {
        transactionHash: req.params.transactionHash?.substring(0, 10) + "...",
        error: err.message,
        ip: req.ip,
      });
      throw new BlockchainError(
        `Failed to retrieve agricultural data: ${err.message}`
      );
    }
  },

  // Verify agricultural data integrity
  verifyDataIntegrity: async (req, res) => {
    try {
      const { transactionHash } = req.params;
      const originalData = req.body;
      const files = req.files || [];

      logger.info("Verify data integrity request", {
        transactionHash: transactionHash.substring(0, 10) + "...",
        hasFiles: files.length > 0,
        filesCount: files.length,
        ip: req.ip,
      });

      // If files are provided, include them in the verification data
      const dataToVerify =
        files.length > 0 ? { ...originalData, files } : originalData;

      const result = await AgriChainService.verifyAgriDataIntegrity(
        dataToVerify,
        transactionHash,
        "hash",
        {
          ip: req.ip,
          userAgent: req.get("User-Agent"),
        }
      );

      const responseData = success(
        result,
        "Data integrity verification completed"
      );

      logger.info("Data integrity verification completed", {
        dataId: result.dataId,
        isValid: result.verification?.isValid,
        status: result.status,
        filesVerified: files.length,
      });

      sendResponse(res, responseData);
    } catch (err) {
      logger.error("Data verification failed", {
        transactionHash: req.params.transactionHash?.substring(0, 10) + "...",
        error: err.message,
        ip: req.ip,
      });
      throw new ValidationError(`Data verification failed: ${err.message}`);
    }
  },

  // Get upload statistics
  getUploadStats: async (req, res) => {
    try {
      logger.info("Get upload statistics request", {
        ip: req.ip,
      });

      // Basic upload stats - could be enhanced with database queries
      const stats = {
        service: "AgriChain File Upload Service",
        status: "active",
        maxFileSize: "10MB",
        maxFiles: 5,
        supportedFormats: ["all"],
        timestamp: new Date().toISOString(),
      };

      const responseData = success(
        stats,
        "Upload statistics retrieved successfully"
      );

      logger.info("Upload statistics retrieved successfully", {
        service: stats.service,
        status: stats.status,
      });

      sendResponse(res, responseData);
    } catch (err) {
      logger.error("Failed to get upload stats", {
        error: err.message,
        ip: req.ip,
      });
      throw new BlockchainError(`Failed to get upload stats: ${err.message}`);
    }
  },
};
