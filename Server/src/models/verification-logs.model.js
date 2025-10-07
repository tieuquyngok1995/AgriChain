/**
 * Verification Logs Model - Handles data verification logging operations
 * Maps to 'verification_logs' table in database
 */

import { BaseModel } from "./base.model.js";
import { ValidationError } from "../middlewares/error.middleware.js";
import { logger } from "../utils/logger.js";

class VerificationLogsModel extends BaseModel {
  constructor() {
    super("verification_logs", "log_id");
  }

  /**
   * Validate verification log data before create/update
   */
  validateVerificationData(data, isUpdate = false) {
    const errors = [];

    // Required fields for creation
    if (!isUpdate) {
      if (!data.data_id) errors.push("data_id is required");
      if (!data.transaction_hash) errors.push("transaction_hash is required");
      if (!data.verification_method)
        errors.push("verification_method is required");
      if (data.is_valid === undefined || data.is_valid === null)
        errors.push("is_valid is required");
      if (!data.stored_hash) errors.push("stored_hash is required");
      if (!data.current_hash) errors.push("current_hash is required");
    }

    // Validate transaction hash format
    if (
      data.transaction_hash &&
      !/^0x[a-fA-F0-9]{64}$/.test(data.transaction_hash)
    ) {
      errors.push(
        "Invalid transaction_hash format (must be 0x + 64 hex characters)"
      );
    }

    // Validate hash formats
    if (data.stored_hash && !/^0x[a-fA-F0-9]{64}$/.test(data.stored_hash)) {
      errors.push(
        "Invalid stored_hash format (must be 0x + 64 hex characters)"
      );
    }

    if (data.current_hash && !/^0x[a-fA-F0-9]{64}$/.test(data.current_hash)) {
      errors.push(
        "Invalid current_hash format (must be 0x + 64 hex characters)"
      );
    }

    // Validate verification method
    if (data.verification_method) {
      const validMethods = [
        "data_only",
        "combined_hash",
        "file_hash",
        "blockchain_verify",
      ];
      if (!validMethods.includes(data.verification_method)) {
        errors.push(
          `Invalid verification method. Must be one of: ${validMethods.join(
            ", "
          )}`
        );
      }
    }

    // Validate boolean fields
    if (data.is_valid !== undefined && typeof data.is_valid !== "boolean") {
      errors.push("is_valid must be a boolean value");
    }

    // Validate IP address format (basic validation)
    if (data.client_ip) {
      const ipv4Regex =
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
      if (!ipv4Regex.test(data.client_ip) && !ipv6Regex.test(data.client_ip)) {
        errors.push("Invalid client_ip format");
      }
    }

    if (errors.length > 0) {
      throw new ValidationError("Verification log validation failed", errors);
    }
  }

  /**
   * Create new verification log with validation
   */
  async createVerificationLog(logData) {
    try {
      // Validate data
      this.validateVerificationData(logData);

      // Set default values
      const dataToInsert = {
        ...logData,
        verification_date: new Date(),
      };

      const result = await this.create(dataToInsert);
      logger.info("Verification log created successfully", {
        log_id: result.log_id,
        data_id: result.data_id,
        is_valid: result.is_valid,
      });

      return result;
    } catch (error) {
      logger.error("Error creating verification log", {
        logData,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update verification log with validation
   */
  async updateVerificationLog(logId, updateData) {
    try {
      // Validate update data
      this.validateVerificationData(updateData, true);

      // Check if log exists
      const existingLog = await this.findById(logId);
      if (!existingLog) {
        throw new ValidationError(
          `Verification log with ID ${logId} not found`
        );
      }

      const result = await this.update(logId, updateData);
      logger.info("Verification log updated successfully", { log_id: logId });

      return result;
    } catch (error) {
      logger.error("Error updating verification log", {
        logId,
        updateData,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find verification logs by data ID
   */
  async findByDataId(dataId, page = 1, pageSize = 10) {
    try {
      const offset = (page - 1) * pageSize;
      const conditions = { data_id: dataId };

      const [logs, total] = await Promise.all([
        this.findAll(conditions, "verification_date DESC", pageSize, offset),
        this.count(conditions),
      ]);

      return {
        logs,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      logger.error("Error finding verification logs by data ID", {
        dataId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find verification logs by transaction hash
   */
  async findByTransactionHash(transactionHash, page = 1, pageSize = 10) {
    try {
      const offset = (page - 1) * pageSize;
      const conditions = { transaction_hash: transactionHash };

      const [logs, total] = await Promise.all([
        this.findAll(conditions, "verification_date DESC", pageSize, offset),
        this.count(conditions),
      ]);

      return {
        logs,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      logger.error("Error finding verification logs by transaction hash", {
        transactionHash,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find verification logs by validity
   */
  async findByValidity(
    isValid,
    page = 1,
    pageSize = 10,
    startDate = null,
    endDate = null
  ) {
    try {
      const offset = (page - 1) * pageSize;
      let whereClause = "WHERE is_valid = @isValid";
      const parameters = { isValid, offset, pageSize };

      if (startDate) {
        whereClause += " AND verification_date >= @start_date";
        parameters.start_date = startDate;
      }

      if (endDate) {
        whereClause += " AND verification_date <= @end_date";
        parameters.end_date = endDate;
      }

      const query = `
        SELECT vl.*, ad.farmer_id, ad.product_type, ad.harvest_date
        FROM verification_logs vl
        LEFT JOIN agricultural_data ad ON vl.data_id = ad.data_id
        ${whereClause}
        ORDER BY vl.verification_date DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM verification_logs vl
        ${whereClause}
      `;

      const [logs, countResult] = await Promise.all([
        this.executeQuery(query, parameters),
        this.executeQuery(countQuery, {
          ...parameters,
          offset: undefined,
          pageSize: undefined,
        }),
      ]);

      return {
        logs,
        total: countResult[0].total,
        page,
        pageSize,
        totalPages: Math.ceil(countResult[0].total / pageSize),
      };
    } catch (error) {
      logger.error("Error finding verification logs by validity", {
        isValid,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get verification statistics
   */
  async getVerificationStatistics(
    startDate = null,
    endDate = null,
    dataId = null
  ) {
    try {
      let whereClause = "WHERE 1=1";
      const parameters = {};

      if (startDate) {
        whereClause += " AND verification_date >= @start_date";
        parameters.start_date = startDate;
      }

      if (endDate) {
        whereClause += " AND verification_date <= @end_date";
        parameters.end_date = endDate;
      }

      if (dataId) {
        whereClause += " AND data_id = @data_id";
        parameters.data_id = dataId;
      }

      const query = `
        SELECT 
          COUNT(*) as total_verifications,
          COUNT(CASE WHEN is_valid = 1 THEN 1 END) as valid_verifications,
          COUNT(CASE WHEN is_valid = 0 THEN 1 END) as invalid_verifications,
          CAST(COUNT(CASE WHEN is_valid = 1 THEN 1 END) * 100.0 / COUNT(*) AS DECIMAL(5,2)) as success_rate,
          COUNT(DISTINCT data_id) as unique_data_verified,
          COUNT(DISTINCT client_ip) as unique_ip_addresses,
          COUNT(CASE WHEN verification_method = 'data_only' THEN 1 END) as data_only_verifications,
          COUNT(CASE WHEN verification_method = 'combined_hash' THEN 1 END) as combined_hash_verifications,
          COUNT(CASE WHEN verification_method = 'file_hash' THEN 1 END) as file_hash_verifications,
          COUNT(CASE WHEN verification_method = 'blockchain_verify' THEN 1 END) as blockchain_verifications,
          MIN(verification_date) as first_verification,
          MAX(verification_date) as last_verification
        FROM verification_logs 
        ${whereClause}
      `;

      const result = await this.executeQuery(query, parameters);
      return result[0];
    } catch (error) {
      logger.error("Error getting verification statistics", {
        startDate,
        endDate,
        dataId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get verification logs by date range
   */
  async getVerificationsByDateRange(
    startDate,
    endDate,
    page = 1,
    pageSize = 10,
    verificationMethod = null
  ) {
    try {
      const offset = (page - 1) * pageSize;
      let whereClause =
        "WHERE vl.verification_date >= @startDate AND vl.verification_date <= @endDate";
      const parameters = { startDate, endDate, offset, pageSize };

      if (verificationMethod) {
        whereClause += " AND vl.verification_method = @verification_method";
        parameters.verification_method = verificationMethod;
      }

      const query = `
        SELECT vl.*, ad.farmer_id, ad.product_type, ad.location
        FROM verification_logs vl
        LEFT JOIN agricultural_data ad ON vl.data_id = ad.data_id
        ${whereClause}
        ORDER BY vl.verification_date DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM verification_logs vl
        ${whereClause}
      `;

      const [logs, countResult] = await Promise.all([
        this.executeQuery(query, parameters),
        this.executeQuery(countQuery, {
          ...parameters,
          offset: undefined,
          pageSize: undefined,
        }),
      ]);

      return {
        logs,
        total: countResult[0].total,
        page,
        pageSize,
        totalPages: Math.ceil(countResult[0].total / pageSize),
      };
    } catch (error) {
      logger.error("Error getting verifications by date range", {
        startDate,
        endDate,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get failed verifications
   */
  async getFailedVerifications(
    page = 1,
    pageSize = 10,
    startDate = null,
    endDate = null
  ) {
    try {
      return await this.findByValidity(
        false,
        page,
        pageSize,
        startDate,
        endDate
      );
    } catch (error) {
      logger.error("Error getting failed verifications", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get verification methods usage
   */
  async getVerificationMethodsUsage(startDate = null, endDate = null) {
    try {
      let whereClause = "WHERE 1=1";
      const parameters = {};

      if (startDate) {
        whereClause += " AND verification_date >= @start_date";
        parameters.start_date = startDate;
      }

      if (endDate) {
        whereClause += " AND verification_date <= @end_date";
        parameters.end_date = endDate;
      }

      const query = `
        SELECT 
          verification_method,
          COUNT(*) as usage_count,
          COUNT(CASE WHEN is_valid = 1 THEN 1 END) as successful_count,
          COUNT(CASE WHEN is_valid = 0 THEN 1 END) as failed_count,
          CAST(COUNT(CASE WHEN is_valid = 1 THEN 1 END) * 100.0 / COUNT(*) AS DECIMAL(5,2)) as success_rate,
          AVG(DATEDIFF(millisecond, '1970-01-01', verification_date)) as avg_verification_time
        FROM verification_logs 
        ${whereClause}
        GROUP BY verification_method
        ORDER BY usage_count DESC
      `;

      return await this.executeQuery(query, parameters);
    } catch (error) {
      logger.error("Error getting verification methods usage", {
        startDate,
        endDate,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get most verified data records
   */
  async getMostVerifiedData(limit = 10, startDate = null, endDate = null) {
    try {
      let whereClause = "WHERE 1=1";
      const parameters = { limit };

      if (startDate) {
        whereClause += " AND vl.verification_date >= @start_date";
        parameters.start_date = startDate;
      }

      if (endDate) {
        whereClause += " AND vl.verification_date <= @end_date";
        parameters.end_date = endDate;
      }

      const query = `
        SELECT TOP (@limit)
          vl.data_id,
          ad.farmer_id,
          ad.product_type,
          ad.location,
          ad.harvest_date,
          COUNT(vl.log_id) as verification_count,
          COUNT(CASE WHEN vl.is_valid = 1 THEN 1 END) as valid_count,
          COUNT(CASE WHEN vl.is_valid = 0 THEN 1 END) as invalid_count,
          CAST(COUNT(CASE WHEN vl.is_valid = 1 THEN 1 END) * 100.0 / COUNT(vl.log_id) AS DECIMAL(5,2)) as success_rate,
          MIN(vl.verification_date) as first_verification,
          MAX(vl.verification_date) as last_verification
        FROM verification_logs vl
        LEFT JOIN agricultural_data ad ON vl.data_id = ad.data_id
        ${whereClause}
        GROUP BY vl.data_id, ad.farmer_id, ad.product_type, ad.location, ad.harvest_date
        ORDER BY verification_count DESC
      `;

      return await this.executeQuery(query, parameters);
    } catch (error) {
      logger.error("Error getting most verified data", {
        limit,
        startDate,
        endDate,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get verification activity by hour
   */
  async getVerificationActivityByHour(date = null) {
    try {
      let whereClause = "WHERE 1=1";
      const parameters = {};

      if (date) {
        whereClause += " AND CAST(verification_date AS DATE) = @date";
        parameters.date = date;
      } else {
        // Default to today
        whereClause +=
          " AND CAST(verification_date AS DATE) = CAST(GETDATE() AS DATE)";
      }

      const query = `
        SELECT 
          DATEPART(HOUR, verification_date) as hour_of_day,
          COUNT(*) as verification_count,
          COUNT(CASE WHEN is_valid = 1 THEN 1 END) as valid_count,
          COUNT(CASE WHEN is_valid = 0 THEN 1 END) as invalid_count
        FROM verification_logs 
        ${whereClause}
        GROUP BY DATEPART(HOUR, verification_date)
        ORDER BY hour_of_day
      `;

      return await this.executeQuery(query, parameters);
    } catch (error) {
      logger.error("Error getting verification activity by hour", {
        date,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get top IP addresses by verification count
   */
  async getTopVerificationIPs(limit = 10, startDate = null, endDate = null) {
    try {
      let whereClause = "WHERE client_ip IS NOT NULL";
      const parameters = { limit };

      if (startDate) {
        whereClause += " AND verification_date >= @start_date";
        parameters.start_date = startDate;
      }

      if (endDate) {
        whereClause += " AND verification_date <= @end_date";
        parameters.end_date = endDate;
      }

      const query = `
        SELECT TOP (@limit)
          client_ip,
          COUNT(*) as verification_count,
          COUNT(CASE WHEN is_valid = 1 THEN 1 END) as valid_count,
          COUNT(CASE WHEN is_valid = 0 THEN 1 END) as invalid_count,
          COUNT(DISTINCT data_id) as unique_data_verified,
          MIN(verification_date) as first_verification,
          MAX(verification_date) as last_verification
        FROM verification_logs 
        ${whereClause}
        GROUP BY client_ip
        ORDER BY verification_count DESC
      `;

      return await this.executeQuery(query, parameters);
    } catch (error) {
      logger.error("Error getting top verification IPs", {
        limit,
        startDate,
        endDate,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Log verification attempt
   */
  async logVerification(
    dataId,
    transactionHash,
    verificationMethod,
    isValid,
    storedHash,
    currentHash,
    clientIp = null,
    userAgent = null
  ) {
    try {
      const logData = {
        data_id: dataId,
        transaction_hash: transactionHash,
        verification_method: verificationMethod,
        is_valid: isValid,
        stored_hash: storedHash,
        current_hash: currentHash,
        client_ip: clientIp,
        user_agent: userAgent,
      };

      return await this.createVerificationLog(logData);
    } catch (error) {
      logger.error("Error logging verification", {
        dataId,
        verificationMethod,
        isValid,
        error: error.message,
      });
      throw error;
    }
  }
}

// Export singleton instance
export const VerificationLogs = new VerificationLogsModel();
