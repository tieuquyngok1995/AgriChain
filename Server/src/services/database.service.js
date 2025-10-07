// Database service for AgriChain metadata and data operations
// Handles all database interactions for agricultural data storage

import {
  executeProcedure,
  executeQuery,
  getConnectionPool,
} from "../config/database.js";
import sql from "mssql";

/**
 * Database service for AgriChain operations
 * Provides methods to store and retrieve agricultural data with metadata
 */
export const DatabaseService = {
  /**
   * Store agricultural data with blockchain metadata
   * @param {Object} agriData - Agricultural data object
   * @param {Object} blockchainData - Blockchain transaction data
   * @param {Array} files - Array of uploaded files (optional)
   * @returns {Promise<Object>} Stored data with ID
   */
  async storeAgriData(agriData, blockchainData, files = []) {
    try {
      console.log("💾 Storing agricultural data to database...");

      // Ensure farmer exists first
      await this.ensureFarmerExists(
        agriData.farmerId,
        agriData.farmerInfo || {}
      );

      // Store agricultural data using stored procedure
      const params = {
        FarmerId: agriData.farmerId,
        ProductType: agriData.productType,
        Location: agriData.location,
        HarvestDate: new Date(agriData.harvestDate),
        Quantity: agriData.quantity || null,
        Quality: agriData.quality || "Standard",
        Notes: agriData.notes || null,
        DataHash: agriData.hash,
        TransactionHash: blockchainData.transactionHash,
        BlockNumber: blockchainData.blockNumber || null,
        HasFiles: files.length > 0 ? 1 : 0,
        FileCount: files.length,
      };

      const result = await executeProcedure("sp_StoreAgriData", params);
      const dataId = result.recordset[0].id;

      // Store blockchain transaction details
      await this.storeBlockchainTransaction(blockchainData);

      // Store file metadata if files exist
      if (files.length > 0) {
        await this.storeFileMetadata(dataId, files);
      }

      // Log the operation
      await this.logOperation("STORE_DATA", {
        dataId,
        farmerId: agriData.farmerId,
        transactionHash: blockchainData.transactionHash,
        fileCount: files.length,
      });

      console.log("✅ Agricultural data stored successfully:", dataId);
      return { dataId, ...result.recordset[0] };
    } catch (error) {
      console.error("❌ Error storing agricultural data:", error.message);
      throw error;
    }
  },

  /**
   * Retrieve agricultural data with metadata
   * @param {string} identifier - Data ID or transaction hash
   * @param {string} type - Type of identifier ('id' or 'hash')
   * @returns {Promise<Object>} Retrieved data with metadata
   */
  async retrieveAgriData(identifier, type = "hash") {
    try {
      console.log(`🔍 Retrieving agricultural data by ${type}:`, identifier);

      let query;
      let params = {};

      if (type === "id") {
        query = `
                    SELECT ad.*, f.full_name, f.email, f.phone, 
                           bt.status as blockchain_status, bt.gas_used, bt.transaction_fee
                    FROM agricultural_data ad
                    LEFT JOIN farmers f ON ad.farmer_id = f.farmer_id
                    LEFT JOIN blockchain_transactions bt ON ad.transaction_hash = bt.transaction_hash
                    WHERE ad.data_id = @identifier
                `;
        params.identifier = identifier;
      } else {
        query = `
                    SELECT ad.*, f.full_name, f.email, f.phone,
                           bt.status as blockchain_status, bt.gas_used, bt.transaction_fee
                    FROM agricultural_data ad
                    LEFT JOIN farmers f ON ad.farmer_id = f.farmer_id
                    LEFT JOIN blockchain_transactions bt ON ad.transaction_hash = bt.transaction_hash
                    WHERE ad.transaction_hash = @identifier OR ad.data_hash = @identifier
                `;
        params.identifier = identifier;
      }

      const result = await executeQuery(query, params);

      if (result.recordset.length === 0) {
        throw new Error(`No data found for ${type}: ${identifier}`);
      }

      const data = result.recordset[0];

      // Get associated files if any
      if (data.has_files) {
        data.files = await this.getFilesByDataId(data.data_id);
      }

      // Get verification logs
      data.verificationHistory = await this.getVerificationLogs(data.data_id);

      console.log("✅ Agricultural data retrieved successfully");
      return data;
    } catch (error) {
      console.error("❌ Error retrieving agricultural data:", error.message);
      throw error;
    }
  },

  /**
   * Store blockchain transaction metadata
   * @param {Object} blockchainData - Blockchain transaction data
   * @returns {Promise<void>}
   */
  async storeBlockchainTransaction(blockchainData) {
    try {
      const query = `
                INSERT INTO blockchain_transactions (
                    transaction_hash, block_number, block_hash, from_address, to_address,
                    gas_used, gas_price, transaction_fee, network_name, network_id, status, transaction_date
                ) VALUES (
                    @transactionHash, @blockNumber, @blockHash, @fromAddress, @toAddress,
                    @gasUsed, @gasPrice, @transactionFee, @networkName, @networkId, @status, @transactionDate
                )
            `;

      const params = {
        transactionHash: blockchainData.transactionHash,
        blockNumber: blockchainData.blockNumber || null,
        blockHash: blockchainData.blockHash || null,
        fromAddress: blockchainData.from || blockchainData.fromAddress,
        toAddress: blockchainData.to || blockchainData.toAddress,
        gasUsed: blockchainData.gasUsed || null,
        gasPrice: blockchainData.gasPrice || null,
        transactionFee: blockchainData.transactionFee || null,
        networkName: blockchainData.networkName || "amoy",
        networkId: blockchainData.networkId || 80002,
        status: blockchainData.status || "Confirmed",
        transactionDate: new Date(),
      };

      await executeQuery(query, params);
      console.log("✅ Blockchain transaction metadata stored");
    } catch (error) {
      // Ignore duplicate key errors
      if (
        !error.message.includes("duplicate") &&
        !error.message.includes("UNIQUE")
      ) {
        console.error(
          "❌ Error storing blockchain transaction:",
          error.message
        );
        throw error;
      }
    }
  },

  /**
   * Store file metadata for uploaded files
   * @param {number} dataId - Agricultural data ID
   * @param {Array} files - Array of file objects
   * @returns {Promise<void>}
   */
  async storeFileMetadata(dataId, files) {
    try {
      console.log(`📁 Storing metadata for ${files.length} files...`);

      const query = `
                INSERT INTO uploaded_files (
                    data_id, original_name, stored_filename, file_path, 
                    file_size, mime_type, file_hash, upload_date
                ) VALUES (
                    @dataId, @originalName, @storedFilename, @filePath,
                    @fileSize, @mimeType, @fileHash, @uploadDate
                )
            `;

      const connection = await getConnectionPool();

      for (const file of files) {
        const request = connection.request();

        request.input("dataId", sql.BigInt, dataId);
        request.input("originalName", sql.NVarChar(255), file.originalname);
        request.input("storedFilename", sql.NVarChar(255), file.filename);
        request.input("filePath", sql.NVarChar(1000), file.path);
        request.input("fileSize", sql.BigInt, file.size);
        request.input("mimeType", sql.NVarChar(100), file.mimetype);
        request.input("fileHash", sql.NVarChar(66), file.hash || "");
        request.input("uploadDate", sql.DateTime2, new Date());

        await request.query(query);
      }

      console.log("✅ File metadata stored successfully");
    } catch (error) {
      console.error("❌ Error storing file metadata:", error.message);
      throw error;
    }
  },

  /**
   * Ensure farmer exists in database
   * @param {string} farmerId - Farmer ID
   * @param {Object} farmerInfo - Farmer information
   * @returns {Promise<void>}
   */
  async ensureFarmerExists(farmerId, farmerInfo = {}) {
    try {
      // Check if farmer exists
      const checkQuery =
        "SELECT farmer_id FROM farmers WHERE farmer_id = @farmerId";
      const checkResult = await executeQuery(checkQuery, { farmerId });

      if (checkResult.recordset.length === 0) {
        // Create farmer record
        const insertQuery = `
                    INSERT INTO farmers (
                        farmer_id, full_name, email, phone, address, 
                        province, district, ward, certification_level, wallet_address
                    ) VALUES (
                        @farmerId, @fullName, @email, @phone, @address,
                        @province, @district, @ward, @certificationLevel, @walletAddress
                    )
                `;

        const params = {
          farmerId,
          fullName: farmerInfo.fullName || `Farmer ${farmerId}`,
          email: farmerInfo.email || null,
          phone: farmerInfo.phone || null,
          address: farmerInfo.address || null,
          province: farmerInfo.province || null,
          district: farmerInfo.district || null,
          ward: farmerInfo.ward || null,
          certificationLevel: farmerInfo.certificationLevel || "Standard",
          walletAddress: farmerInfo.walletAddress || null,
        };

        await executeQuery(insertQuery, params);
        console.log("✅ Farmer record created:", farmerId);
      }
    } catch (error) {
      console.error("❌ Error ensuring farmer exists:", error.message);
      throw error;
    }
  },

  /**
   * Get files associated with agricultural data
   * @param {number} dataId - Agricultural data ID
   * @returns {Promise<Array>} Array of file objects
   */
  async getFilesByDataId(dataId) {
    try {
      const query = `
                SELECT file_id, original_name, stored_filename, file_path,
                       file_size, mime_type, file_hash, upload_date, is_active
                FROM uploaded_files 
                WHERE data_id = @dataId AND is_active = 1
                ORDER BY upload_date DESC
            `;

      const result = await executeQuery(query, { dataId });
      return result.recordset;
    } catch (error) {
      console.error("❌ Error getting files by data ID:", error.message);
      return [];
    }
  },

  /**
   * Log verification attempt
   * @param {number} dataId - Agricultural data ID
   * @param {boolean} isValid - Verification result
   * @param {string} method - Verification method
   * @param {Object} details - Additional details
   * @returns {Promise<void>}
   */
  async logVerification(
    dataId,
    isValid,
    method = "hash_comparison",
    details = {}
  ) {
    try {
      const query = `
                INSERT INTO verification_logs (
                    data_id, transaction_hash, verification_date, verification_method, is_valid,
                    stored_hash, current_hash, client_ip, user_agent
                ) VALUES (
                    @dataId, @transactionHash, @verificationDate, @verificationMethod, @isValid,
                    @storedHash, @currentHash, @clientIp, @userAgent
                )
            `;

      const params = {
        dataId,
        transactionHash:
          details.transactionHash ||
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        verificationDate: new Date(),
        isValid: isValid ? 1 : 0,
        verificationMethod: method,
        storedHash:
          details.storedHash ||
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        currentHash:
          details.currentHash ||
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        clientIp: details.ip || null,
        userAgent: details.userAgent || null,
      };

      await executeQuery(query, params);
      console.log("✅ Verification logged successfully");
    } catch (error) {
      console.error("❌ Error logging verification:", error.message);
    }
  },

  /**
   * Get verification logs for data
   * @param {number} dataId - Agricultural data ID
   * @returns {Promise<Array>} Array of verification logs
   */
  async getVerificationLogs(dataId) {
    try {
      const query = `
                SELECT log_id, verification_date, is_valid, verification_method, 
                       stored_hash, current_hash, client_ip, user_agent
                FROM verification_logs 
                WHERE data_id = @dataId 
                ORDER BY verification_date DESC
            `;

      const result = await executeQuery(query, { dataId });
      return result.recordset;
    } catch (error) {
      console.error("❌ Error getting verification logs:", error.message);
      return [];
    }
  },

  /**
   * Log system operations
   * @param {string} operation - Operation type
   * @param {Object} details - Operation details
   * @returns {Promise<void>}
   */
  async logOperation(operation, details = {}) {
    try {
      const query = `
                INSERT INTO system_logs (
                    log_level, log_category, message, details, timestamp
                ) VALUES (
                    @logLevel, @logCategory, @message, @details, @timestamp
                )
            `;

      const params = {
        logLevel: "INFO",
        logCategory: "API",
        message: operation,
        details: JSON.stringify(details),
        timestamp: new Date(),
      };

      await executeQuery(query, params);
    } catch (error) {
      console.error("❌ Error logging operation:", error.message);
    }
  },

  /**
   * Get farmer statistics
   * @param {string} farmerId - Farmer ID (optional)
   * @returns {Promise<Object>} Farmer statistics
   */
  async getFarmerStats(farmerId = null) {
    try {
      let query = `
                SELECT 
                    f.farmer_id,
                    f.full_name,
                    f.certification_level,
                    COUNT(ad.data_id) as total_records,
                    COUNT(CASE WHEN ad.has_files = 1 THEN 1 END) as records_with_files,
                    SUM(ad.quantity) as total_quantity,
                    MAX(ad.harvest_date) as latest_harvest,
                    COUNT(DISTINCT ad.product_type) as product_types
                FROM farmers f
                LEFT JOIN agricultural_data ad ON f.farmer_id = ad.farmer_id
            `;

      const params = {};

      if (farmerId) {
        query += " WHERE f.farmer_id = @farmerId";
        params.farmerId = farmerId;
      }

      query += " GROUP BY f.farmer_id, f.full_name, f.certification_level";

      const result = await executeQuery(query, params);
      return farmerId ? result.recordset[0] : result.recordset;
    } catch (error) {
      console.error("❌ Error getting farmer statistics:", error.message);
      throw error;
    }
  },

  /**
   * Search agricultural data with filters
   * @param {Object} filters - Search filters
   * @returns {Promise<Array>} Array of matching records
   */
  async searchAgriData(filters = {}) {
    try {
      let query = `
                SELECT ad.*, f.full_name, f.certification_level
                FROM agricultural_data ad
                LEFT JOIN farmers f ON ad.farmer_id = f.farmer_id
                WHERE 1=1
            `;

      const params = {};

      if (filters.farmerId) {
        query += " AND ad.farmer_id = @farmerId";
        params.farmerId = filters.farmerId;
      }

      if (filters.productType) {
        query += " AND ad.product_type LIKE @productType";
        params.productType = `%${filters.productType}%`;
      }

      if (filters.startDate) {
        query += " AND ad.harvest_date >= @startDate";
        params.startDate = new Date(filters.startDate);
      }

      if (filters.endDate) {
        query += " AND ad.harvest_date <= @endDate";
        params.endDate = new Date(filters.endDate);
      }

      if (filters.location) {
        query += " AND ad.location LIKE @location";
        params.location = `%${filters.location}%`;
      }

      query += " ORDER BY ad.harvest_date DESC";

      if (filters.limit) {
        query += ` OFFSET ${filters.offset || 0} ROWS FETCH NEXT ${
          filters.limit
        } ROWS ONLY`;
      }

      const result = await executeQuery(query, params);
      return result.recordset;
    } catch (error) {
      console.error("❌ Error searching agricultural data:", error.message);
      throw error;
    }
  },
};

export default DatabaseService;
