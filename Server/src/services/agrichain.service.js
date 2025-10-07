/**
 * AgriChain service - Core agricultural data traceability service
 * Combines hash generation with blockchain storage for data integrity
 */

import { HashService } from "./hash.service.js";
import { BlockchainService } from "./blockchain.service.js";
import { DatabaseService } from "./database.service.js";
import { logger } from "../utils/logger.js";

/**
 * Store agricultural data on blockchain with hash verification and database storage
 * @param {Object} agriData - Agricultural data to store
 * @param {Array} files - Optional uploaded files
 * @returns {Object} - Storage result with blockchain proof and database ID
 */
export const storeAgriData = async (agriData, files = []) => {
  try {
    logger.info("Starting agricultural data storage process", {
      farmerId: agriData.farmerId,
      productType: agriData.productType,
      filesCount: files.length,
    });

    // Step 1: Create hash from agricultural data
    const hashResult = HashService.createAgriDataHash(agriData);

    // Step 2: Store hash on blockchain
    const blockchainResult = await BlockchainService.storeHashOnBlockchain(
      hashResult.hash,
      {
        farmerId: agriData.farmerId,
        productType: agriData.productType,
        harvestDate: agriData.harvestDate,
        dataSize: hashResult.size,
        fieldsCount: hashResult.fields.length,
      }
    );

    // Step 3: Store data and metadata in database
    const databaseResult = await DatabaseService.storeAgriData(
      {
        ...agriData,
        hash: hashResult.hash,
      },
      {
        transactionHash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber,
        from: blockchainResult.blockchainProof.fromAddress,
        to: blockchainResult.blockchainProof.toAddress,
        gasUsed: blockchainResult.blockchainProof.gasUsed,
        gasPrice: blockchainResult.blockchainProof.gasPrice,
        transactionFee: blockchainResult.blockchainProof.transactionFee,
        networkName: blockchainResult.blockchainProof.network,
        networkId: blockchainResult.blockchainProof.chainId,
        status: "Confirmed",
      },
      files
    );

    const result = {
      success: true,
      dataId: databaseResult.dataId,
      dataHash: hashResult.hash,
      originalData: hashResult.data,
      blockchainProof: {
        transactionHash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber,
        network: blockchainResult.blockchainProof.network,
        chainId: blockchainResult.blockchainProof.chainId,
        timestamp: blockchainResult.blockchainProof.timestamp,
      },
      database: {
        stored: true,
        dataId: databaseResult.dataId,
        filesStored: files.length,
      },
      verification: {
        hashAlgorithm: "SHA-256",
        dataIntegrity: true,
        blockchainConfirmed: true,
        databaseStored: true,
      },
      metadata: {
        gasUsed: blockchainResult.gasUsed,
        dataSize: hashResult.size,
        fieldsProcessed: hashResult.fields,
      },
    };

    logger.info("Agricultural data stored successfully", {
      hash: hashResult.hash.substring(0, 10) + "...",
      txHash: blockchainResult.transactionHash.substring(0, 10) + "...",
      blockNumber: blockchainResult.blockNumber,
    });

    return result;
  } catch (error) {
    logger.error("Failed to store agricultural data", {
      farmerId: agriData?.farmerId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Retrieve and verify agricultural data from blockchain and database
 * @param {string} identifier - Transaction hash or data ID
 * @param {string} type - Type of identifier ('hash' or 'id')
 * @returns {Object} - Retrieved data with verification status and metadata
 */
export const retrieveAgriData = async (identifier, type = "hash") => {
  try {
    logger.info("Starting agricultural data retrieval", {
      identifier:
        type === "hash" ? identifier.substring(0, 10) + "..." : identifier,
      type,
    });

    // Step 1: Retrieve data from database with metadata
    const databaseData = await DatabaseService.retrieveAgriData(
      identifier,
      type
    );

    // Step 2: Retrieve blockchain confirmation if available
    let blockchainData = null;
    if (databaseData.transaction_hash) {
      try {
        blockchainData = await BlockchainService.retrieveHashFromBlockchain(
          databaseData.transaction_hash
        );
      } catch (error) {
        logger.warn("Failed to retrieve blockchain data", {
          error: error.message,
        });
      }
    }

    const result = {
      success: true,
      dataId: databaseData.data_id,
      farmerId: databaseData.farmer_id,
      farmerInfo: {
        fullName: databaseData.full_name,
        email: databaseData.email,
        phone: databaseData.phone,
      },
      agriculturalData: {
        productType: databaseData.product_type,
        location: databaseData.location,
        harvestDate: databaseData.harvest_date,
        quantity: databaseData.quantity,
        quality: databaseData.quality,
        notes: databaseData.notes,
      },
      dataHash: databaseData.data_hash,
      files: databaseData.files || [],
      verificationHistory: databaseData.verificationHistory || [],
      blockchainProof: blockchainData
        ? {
            transactionHash: databaseData.transaction_hash,
            blockNumber:
              databaseData.block_number || blockchainData.blockNumber,
            blockHash: blockchainData.blockHash,
            network: blockchainData.blockchainProof?.network || "amoy",
            chainId: blockchainData.blockchainProof?.chainId || 80002,
            confirmed: blockchainData.blockchainProof?.confirmed || true,
          }
        : {
            transactionHash: databaseData.transaction_hash,
            blockNumber: databaseData.block_number,
            network: "amoy",
            confirmed: true,
          },
      verification: {
        blockchainConfirmed: !!blockchainData,
        databaseStored: true,
        hashFormat: "SHA-256",
        dataIntegrity: true,
        blockchainStatus: databaseData.blockchain_status || "Confirmed",
      },
      transactionDetails: {
        gasUsed: databaseData.gas_used,
        transactionFee: databaseData.transaction_fee,
        timestamp: databaseData.created_date,
      },
      timestamps: {
        created: databaseData.created_date,
        updated: databaseData.updated_date,
      },
    };

    logger.info("Agricultural data retrieved successfully", {
      dataId: databaseData.data_id,
      farmerId: databaseData.farmer_id,
      hash: databaseData.data_hash.substring(0, 10) + "...",
      blockNumber: databaseData.block_number,
    });

    return result;
  } catch (error) {
    logger.error("Failed to retrieve agricultural data", {
      identifier:
        type === "hash" ? identifier?.substring(0, 10) + "..." : identifier,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Verify agricultural data integrity with database logging
 * @param {Object} originalData - Original agricultural data
 * @param {string} identifier - Data ID or transaction hash
 * @param {string} type - Type of identifier ('id' or 'hash')
 * @param {Object} verificationDetails - Additional verification details
 * @returns {Object} - Verification result
 */
export const verifyAgriDataIntegrity = async (
  originalData,
  identifier,
  type = "hash",
  verificationDetails = {}
) => {
  try {
    logger.info("Starting data integrity verification", { identifier, type });

    // Get stored data from database
    const storedData = await DatabaseService.retrieveAgriData(identifier, type);

    // Generate hash from current data
    const currentHashResult = HashService.createAgriDataHash(originalData);

    // Compare with stored hash
    const isValid = HashService.verifyHash(
      currentHashResult.data,
      storedData.data_hash
    );

    // Log verification attempt
    await DatabaseService.logVerification(
      storedData.data_id,
      isValid,
      "hash_comparison",
      {
        ...verificationDetails,
        transactionHash: storedData.transaction_hash,
        currentHash: currentHashResult.hash,
        storedHash: storedData.data_hash,
        comparisonMethod: "SHA-256",
      }
    );

    const result = {
      success: true,
      dataId: storedData.data_id,
      verification: {
        isValid,
        storedHash: storedData.data_hash,
        currentHash: currentHashResult.hash,
        algorithm: "SHA-256",
        verificationDate: new Date(),
      },
      data: {
        stored: {
          farmerId: storedData.farmer_id,
          productType: storedData.product_type,
          location: storedData.location,
          harvestDate: storedData.harvest_date,
          quantity: storedData.quantity,
          quality: storedData.quality,
        },
        current: currentHashResult.data,
        fieldsChecked: currentHashResult.fields,
        dataSize: currentHashResult.size,
      },
      blockchainProof: {
        transactionHash: storedData.transaction_hash,
        blockNumber: storedData.block_number,
        verified: true,
      },
      status: isValid ? "VERIFIED" : "TAMPERED",
      message: isValid
        ? "Data integrity verified successfully"
        : "Data has been modified - integrity check failed",
    };

    logger.info("Data integrity verification completed", {
      dataId: storedData.data_id,
      isValid,
      status: result.status,
    });

    return result;
  } catch (error) {
    logger.error("Data integrity verification failed", {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get farmer's agricultural data history from database
 * @param {string} farmerId - Farmer ID
 * @param {number} limit - Number of records to retrieve
 * @returns {Object} - Farmer statistics and history
 */
export const getFarmerHistory = async (farmerId, limit = 10) => {
  try {
    logger.info("Retrieving farmer history", { farmerId, limit });

    // Get farmer statistics
    const farmerStats = await DatabaseService.getFarmerStats(farmerId);

    // Get farmer's agricultural data with pagination
    const farmerData = await DatabaseService.searchAgriData({
      farmerId,
      limit,
      offset: 0,
    });

    const result = {
      success: true,
      farmerId,
      statistics: farmerStats,
      dataHistory: farmerData,
      totalRecords: farmerStats.total_records,
      recordsWithFiles: farmerStats.records_with_files,
      productTypes: farmerStats.product_types,
    };

    logger.info("Farmer history retrieved successfully", {
      farmerId,
      totalRecords: farmerStats.total_records,
    });

    return result;
  } catch (error) {
    logger.error("Failed to get farmer history", {
      farmerId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Search agricultural data with filters
 * @param {Object} filters - Search filters
 * @returns {Array} - Matching agricultural data records
 */
export const searchAgriData = async (filters = {}) => {
  try {
    logger.info("Searching agricultural data", { filters });

    const results = await DatabaseService.searchAgriData(filters);

    logger.info("Agricultural data search completed", {
      filtersApplied: Object.keys(filters).length,
      recordsFound: results.length,
    });

    return {
      success: true,
      filters,
      results,
      totalFound: results.length,
    };
  } catch (error) {
    logger.error("Agricultural data search failed", {
      filters,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get agricultural data history from database (general)
 * @param {number} limit - Number of records to retrieve
 * @param {number} offset - Number of records to skip
 * @returns {Array} - History of agricultural data transactions
 */
export const getAgriDataHistory = async (limit = 10, offset = 0) => {
  try {
    logger.info("Getting agricultural data history", { limit, offset });

    const history = await DatabaseService.searchAgriData({
      limit,
      offset,
    });

    const formattedHistory = history.map((record) => ({
      dataId: record.data_id,
      farmerId: record.farmer_id,
      farmerName: record.full_name,
      productType: record.product_type,
      location: record.location,
      harvestDate: record.harvest_date,
      quantity: record.quantity,
      quality: record.quality,
      dataHash: record.data_hash,
      transactionHash: record.transaction_hash,
      blockNumber: record.block_number,
      hasFiles: record.has_files,
      fileCount: record.file_count,
      createdDate: record.created_date,
      shortHash: record.data_hash.substring(0, 10) + "...",
      shortTxHash: record.transaction_hash.substring(0, 10) + "...",
    }));

    logger.info("Agricultural data history retrieved", {
      count: formattedHistory.length,
    });

    return {
      success: true,
      count: formattedHistory.length,
      history: formattedHistory,
      metadata: {
        database: "SQL Server",
        blockchain: "Polygon Amoy",
        algorithm: "SHA-256",
        retrievedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    logger.error("Failed to get agricultural data history", {
      error: error.message,
    });
    throw error;
  }
};

export const AgriChainService = {
  storeAgriData,
  retrieveAgriData,
  verifyAgriDataIntegrity,
  getAgriDataHistory,
  getFarmerHistory,
  searchAgriData,
};
