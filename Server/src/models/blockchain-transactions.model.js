/**
 * Blockchain Transactions Model - Handles blockchain transaction data operations
 * Maps to 'blockchain_transactions' table in database
 */

import { BaseModel } from "./base.model.js";
import { ValidationError } from "../middlewares/error.middleware.js";
import { logger } from "../utils/logger.js";

class BlockchainTransactionsModel extends BaseModel {
  constructor() {
    super("blockchain_transactions", "transaction_id");
  }

  /**
   * Validate blockchain transaction data before create/update
   */
  validateTransactionData(data, isUpdate = false) {
    const errors = [];

    // Required fields for creation
    if (!isUpdate) {
      if (!data.transaction_hash) errors.push("transaction_hash is required");
      if (!data.from_address) errors.push("from_address is required");
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

    // Validate block hash format
    if (data.block_hash && !/^0x[a-fA-F0-9]{64}$/.test(data.block_hash)) {
      errors.push("Invalid block_hash format (must be 0x + 64 hex characters)");
    }

    // Validate Ethereum address format
    if (data.from_address && !/^0x[a-fA-F0-9]{40}$/.test(data.from_address)) {
      errors.push(
        "Invalid from_address format (must be 0x + 40 hex characters)"
      );
    }

    if (data.to_address && !/^0x[a-fA-F0-9]{40}$/.test(data.to_address)) {
      errors.push("Invalid to_address format (must be 0x + 40 hex characters)");
    }

    // Validate numeric fields
    if (data.block_number !== undefined && data.block_number !== null) {
      if (data.block_number < 0) {
        errors.push("Block number must be a positive number");
      }
    }

    if (data.gas_used !== undefined && data.gas_used !== null) {
      if (data.gas_used < 0) {
        errors.push("Gas used must be a positive number");
      }
    }

    if (data.gas_price !== undefined && data.gas_price !== null) {
      if (data.gas_price < 0) {
        errors.push("Gas price must be a positive number");
      }
    }

    if (data.transaction_fee !== undefined && data.transaction_fee !== null) {
      if (data.transaction_fee < 0) {
        errors.push("Transaction fee must be a positive number");
      }
    }

    if (data.network_id !== undefined && data.network_id !== null) {
      if (data.network_id < 0) {
        errors.push("Network ID must be a positive number");
      }
    }

    // Validate status
    if (data.status) {
      const validStatuses = ["Pending", "Confirmed", "Failed", "Reverted"];
      if (!validStatuses.includes(data.status)) {
        errors.push(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        );
      }
    }

    // Validate network name
    if (data.network_name) {
      const validNetworks = [
        "mainnet",
        "goerli",
        "sepolia",
        "polygon",
        "mumbai",
        "amoy",
        "bsc",
        "bsc-testnet",
      ];
      if (!validNetworks.includes(data.network_name.toLowerCase())) {
        errors.push(
          `Invalid network name. Must be one of: ${validNetworks.join(", ")}`
        );
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(
        "Blockchain transaction validation failed",
        errors
      );
    }
  }

  /**
   * Create new blockchain transaction record with validation
   */
  async createTransaction(transactionData) {
    try {
      // Validate data
      this.validateTransactionData(transactionData);

      // Check if transaction hash already exists
      const existingTransaction = await this.findByTransactionHash(
        transactionData.transaction_hash
      );
      if (existingTransaction) {
        throw new ValidationError(
          `Transaction with hash ${transactionData.transaction_hash} already exists`
        );
      }

      // Set default values
      const dataToInsert = {
        ...transactionData,
        network_name: transactionData.network_name || "amoy",
        network_id: transactionData.network_id || 80002,
        status: transactionData.status || "Pending",
        created_date: new Date(),
      };

      const result = await this.create(dataToInsert);
      logger.info("Blockchain transaction created successfully", {
        transaction_id: result.transaction_id,
        transaction_hash: result.transaction_hash,
      });

      return result;
    } catch (error) {
      logger.error("Error creating blockchain transaction", {
        transactionData,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update blockchain transaction with validation
   */
  async updateTransaction(transactionId, updateData) {
    try {
      // Validate update data
      this.validateTransactionData(updateData, true);

      // Check if transaction exists
      const existingTransaction = await this.findById(transactionId);
      if (!existingTransaction) {
        throw new ValidationError(
          `Blockchain transaction with ID ${transactionId} not found`
        );
      }

      const result = await this.update(transactionId, updateData);
      logger.info("Blockchain transaction updated successfully", {
        transaction_id: transactionId,
      });

      return result;
    } catch (error) {
      logger.error("Error updating blockchain transaction", {
        transactionId,
        updateData,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find transaction by transaction hash
   */
  async findByTransactionHash(transactionHash) {
    try {
      const query =
        "SELECT * FROM blockchain_transactions WHERE transaction_hash = @transactionHash";
      const result = await this.executeQuery(query, { transactionHash });
      return result[0] || null;
    } catch (error) {
      logger.error("Error finding transaction by hash", {
        transactionHash,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find transactions by block number
   */
  async findByBlockNumber(blockNumber, page = 1, pageSize = 10) {
    try {
      const offset = (page - 1) * pageSize;
      const conditions = { block_number: blockNumber };

      const [transactions, total] = await Promise.all([
        this.findAll(conditions, "created_date DESC", pageSize, offset),
        this.count(conditions),
      ]);

      return {
        transactions,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      logger.error("Error finding transactions by block number", {
        blockNumber,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find transactions by from address
   */
  async findByFromAddress(fromAddress, page = 1, pageSize = 10) {
    try {
      const offset = (page - 1) * pageSize;
      const conditions = { from_address: fromAddress };

      const [transactions, total] = await Promise.all([
        this.findAll(conditions, "created_date DESC", pageSize, offset),
        this.count(conditions),
      ]);

      return {
        transactions,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      logger.error("Error finding transactions by from address", {
        fromAddress,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find transactions by status
   */
  async findByStatus(status, page = 1, pageSize = 10) {
    try {
      const offset = (page - 1) * pageSize;
      const conditions = { status };

      const [transactions, total] = await Promise.all([
        this.findAll(conditions, "created_date DESC", pageSize, offset),
        this.count(conditions),
      ]);

      return {
        transactions,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      logger.error("Error finding transactions by status", {
        status,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find transactions by network
   */
  async findByNetwork(networkName, page = 1, pageSize = 10) {
    try {
      const offset = (page - 1) * pageSize;
      const conditions = { network_name: networkName };

      const [transactions, total] = await Promise.all([
        this.findAll(conditions, "created_date DESC", pageSize, offset),
        this.count(conditions),
      ]);

      return {
        transactions,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      logger.error("Error finding transactions by network", {
        networkName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStatistics(
    startDate = null,
    endDate = null,
    networkName = null
  ) {
    try {
      let whereClause = "WHERE 1=1";
      const parameters = {};

      if (startDate) {
        whereClause += " AND created_date >= @start_date";
        parameters.start_date = startDate;
      }

      if (endDate) {
        whereClause += " AND created_date <= @end_date";
        parameters.end_date = endDate;
      }

      if (networkName) {
        whereClause += " AND network_name = @network_name";
        parameters.network_name = networkName;
      }

      const query = `
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN status = 'Confirmed' THEN 1 END) as confirmed_transactions,
          COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_transactions,
          COUNT(CASE WHEN status = 'Failed' THEN 1 END) as failed_transactions,
          COUNT(CASE WHEN status = 'Reverted' THEN 1 END) as reverted_transactions,
          COUNT(DISTINCT from_address) as unique_addresses,
          COUNT(DISTINCT network_name) as unique_networks,
          SUM(CASE WHEN gas_used IS NOT NULL THEN gas_used ELSE 0 END) as total_gas_used,
          AVG(CASE WHEN gas_used IS NOT NULL THEN gas_used ELSE NULL END) as avg_gas_used,
          SUM(CASE WHEN transaction_fee IS NOT NULL THEN transaction_fee ELSE 0 END) as total_fees,
          AVG(CASE WHEN transaction_fee IS NOT NULL THEN transaction_fee ELSE NULL END) as avg_fee,
          MIN(created_date) as first_transaction,
          MAX(created_date) as last_transaction
        FROM blockchain_transactions 
        ${whereClause}
      `;

      const result = await this.executeQuery(query, parameters);
      return result[0];
    } catch (error) {
      logger.error("Error getting transaction statistics", {
        startDate,
        endDate,
        networkName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get transactions by date range
   */
  async getTransactionsByDateRange(
    startDate,
    endDate,
    page = 1,
    pageSize = 10,
    status = null
  ) {
    try {
      const offset = (page - 1) * pageSize;
      let whereClause =
        "WHERE created_date >= @startDate AND created_date <= @endDate";
      const parameters = { startDate, endDate, offset, pageSize };

      if (status) {
        whereClause += " AND status = @status";
        parameters.status = status;
      }

      const query = `
        SELECT bt.*, ad.farmer_id, ad.product_type
        FROM blockchain_transactions bt
        LEFT JOIN agricultural_data ad ON bt.data_id = ad.data_id
        ${whereClause}
        ORDER BY bt.created_date DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM blockchain_transactions bt
        ${whereClause}
      `;

      const [transactions, countResult] = await Promise.all([
        this.executeQuery(query, parameters),
        this.executeQuery(countQuery, {
          ...parameters,
          offset: undefined,
          pageSize: undefined,
        }),
      ]);

      return {
        transactions,
        total: countResult[0].total,
        page,
        pageSize,
        totalPages: Math.ceil(countResult[0].total / pageSize),
      };
    } catch (error) {
      logger.error("Error getting transactions by date range", {
        startDate,
        endDate,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get failed transactions
   */
  async getFailedTransactions(
    page = 1,
    pageSize = 10,
    startDate = null,
    endDate = null
  ) {
    try {
      const offset = (page - 1) * pageSize;
      let whereClause =
        "WHERE (status = @failedStatus OR status = @revertedStatus)";
      const parameters = {
        failedStatus: "Failed",
        revertedStatus: "Reverted",
        offset,
        pageSize,
      };

      if (startDate) {
        whereClause += " AND created_date >= @start_date";
        parameters.start_date = startDate;
      }

      if (endDate) {
        whereClause += " AND created_date <= @end_date";
        parameters.end_date = endDate;
      }

      const query = `
        SELECT bt.*, ad.farmer_id, ad.product_type
        FROM blockchain_transactions bt
        LEFT JOIN agricultural_data ad ON bt.data_id = ad.data_id
        ${whereClause}
        ORDER BY bt.created_date DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM blockchain_transactions bt
        ${whereClause}
      `;

      const [transactions, countResult] = await Promise.all([
        this.executeQuery(query, parameters),
        this.executeQuery(countQuery, {
          ...parameters,
          offset: undefined,
          pageSize: undefined,
        }),
      ]);

      return {
        transactions,
        total: countResult[0].total,
        page,
        pageSize,
        totalPages: Math.ceil(countResult[0].total / pageSize),
      };
    } catch (error) {
      logger.error("Error getting failed transactions", {
        startDate,
        endDate,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get pending transactions
   */
  async getPendingTransactions(page = 1, pageSize = 10) {
    try {
      return await this.findByStatus("Pending", page, pageSize);
    } catch (error) {
      logger.error("Error getting pending transactions", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get gas usage statistics by network
   */
  async getGasStatsByNetwork() {
    try {
      const query = `
        SELECT 
          network_name,
          COUNT(*) as transaction_count,
          SUM(CASE WHEN gas_used IS NOT NULL THEN gas_used ELSE 0 END) as total_gas_used,
          AVG(CASE WHEN gas_used IS NOT NULL THEN gas_used ELSE NULL END) as avg_gas_used,
          MIN(CASE WHEN gas_used IS NOT NULL THEN gas_used ELSE NULL END) as min_gas_used,
          MAX(CASE WHEN gas_used IS NOT NULL THEN gas_used ELSE NULL END) as max_gas_used,
          SUM(CASE WHEN transaction_fee IS NOT NULL THEN transaction_fee ELSE 0 END) as total_fees,
          AVG(CASE WHEN transaction_fee IS NOT NULL THEN transaction_fee ELSE NULL END) as avg_fee
        FROM blockchain_transactions
        WHERE status = 'Confirmed'
        GROUP BY network_name
        ORDER BY transaction_count DESC
      `;

      return await this.executeQuery(query);
    } catch (error) {
      logger.error("Error getting gas statistics by network", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    transactionHash,
    status,
    blockNumber = null,
    blockHash = null,
    confirmedDate = null
  ) {
    try {
      const updateData = {
        status,
        transaction_date: confirmedDate || new Date(),
      };

      if (blockNumber) {
        updateData.block_number = blockNumber;
      }

      if (blockHash) {
        updateData.block_hash = blockHash;
      }

      if (status === "Confirmed" && !confirmedDate) {
        updateData.confirmed_date = new Date();
      }

      const query = `
        UPDATE blockchain_transactions 
        SET status = @status,
            block_number = COALESCE(@block_number, block_number),
            block_hash = COALESCE(@block_hash, block_hash),
            confirmed_date = COALESCE(@confirmed_date, confirmed_date),
            transaction_date = @transaction_date
        OUTPUT INSERTED.*
        WHERE transaction_hash = @transaction_hash
      `;

      const result = await this.executeQuery(query, {
        status,
        block_number: blockNumber,
        block_hash: blockHash,
        confirmed_date: updateData.confirmed_date,
        transaction_date: updateData.transaction_date,
        transaction_hash: transactionHash,
      });

      if (result.length === 0) {
        throw new ValidationError(
          `Transaction with hash ${transactionHash} not found`
        );
      }

      logger.info("Transaction status updated successfully", {
        transaction_hash: transactionHash,
        status,
      });

      return result[0];
    } catch (error) {
      logger.error("Error updating transaction status", {
        transactionHash,
        status,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get most active addresses
   */
  async getMostActiveAddresses(limit = 10, startDate = null, endDate = null) {
    try {
      let whereClause = "WHERE 1=1";
      const parameters = { limit };

      if (startDate) {
        whereClause += " AND created_date >= @start_date";
        parameters.start_date = startDate;
      }

      if (endDate) {
        whereClause += " AND created_date <= @end_date";
        parameters.end_date = endDate;
      }

      const query = `
        SELECT TOP (@limit)
          from_address,
          COUNT(*) as transaction_count,
          COUNT(CASE WHEN status = 'Confirmed' THEN 1 END) as confirmed_count,
          COUNT(CASE WHEN status = 'Failed' THEN 1 END) as failed_count,
          SUM(CASE WHEN gas_used IS NOT NULL THEN gas_used ELSE 0 END) as total_gas_used,
          SUM(CASE WHEN transaction_fee IS NOT NULL THEN transaction_fee ELSE 0 END) as total_fees,
          MIN(created_date) as first_transaction,
          MAX(created_date) as last_transaction
        FROM blockchain_transactions 
        ${whereClause}
        GROUP BY from_address
        ORDER BY transaction_count DESC
      `;

      return await this.executeQuery(query, parameters);
    } catch (error) {
      logger.error("Error getting most active addresses", {
        limit,
        startDate,
        endDate,
        error: error.message,
      });
      throw error;
    }
  }
}

// Export singleton instance
export const BlockchainTransactions = new BlockchainTransactionsModel();
