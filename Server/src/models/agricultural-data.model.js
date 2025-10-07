/**
 * Agricultural Data Model - Handles agricultural production data operations
 * Maps to 'agricultural_data' table in database
 */

import { BaseModel } from "./base.model.js";
import {
  ValidationError,
  DatabaseError,
} from "../middlewares/error.middleware.js";
import { logger } from "../utils/logger.js";

class AgriculturalDataModel extends BaseModel {
  constructor() {
    super("agricultural_data", "data_id");
  }

  /**
   * Validate agricultural data before create/update
   */
  validateAgriculturalData(data, isUpdate = false) {
    const errors = [];

    // Required fields for creation
    if (!isUpdate) {
      if (!data.farmer_id) errors.push("farmer_id is required");
      if (!data.product_type) errors.push("product_type is required");
      if (!data.location) errors.push("location is required");
      if (!data.harvest_date) errors.push("harvest_date is required");
      if (!data.data_hash) errors.push("data_hash is required");
      if (!data.transaction_hash) errors.push("transaction_hash is required");
    }

    // Validate harvest date
    if (data.harvest_date) {
      const harvestDate = new Date(data.harvest_date);
      const now = new Date();
      const oneYearAgo = new Date(
        now.getFullYear() - 1,
        now.getMonth(),
        now.getDate()
      );
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      if (harvestDate < oneYearAgo || harvestDate > tomorrow) {
        errors.push(
          "Harvest date must be within the last year and not future dated"
        );
      }
    }

    // Validate quantity
    if (data.quantity !== undefined && data.quantity !== null) {
      if (data.quantity < 0) {
        errors.push("Quantity must be a positive number");
      }
      if (data.quantity > 999999) {
        errors.push("Quantity is too large (max: 999,999)");
      }
    }

    // Validate quality
    if (data.quality) {
      const validQualities = [
        "Standard",
        "Premium",
        "Organic",
        "Grade A",
        "Grade B",
        "Grade C",
      ];
      if (!validQualities.includes(data.quality)) {
        errors.push(
          `Invalid quality. Must be one of: ${validQualities.join(", ")}`
        );
      }
    }

    // Validate hash format
    if (data.data_hash && !/^0x[a-fA-F0-9]{64}$/.test(data.data_hash)) {
      errors.push("Invalid data_hash format (must be 0x + 64 hex characters)");
    }

    if (data.combined_hash && !/^0x[a-fA-F0-9]{64}$/.test(data.combined_hash)) {
      errors.push(
        "Invalid combined_hash format (must be 0x + 64 hex characters)"
      );
    }

    if (
      data.transaction_hash &&
      !/^0x[a-fA-F0-9]{64}$/.test(data.transaction_hash)
    ) {
      errors.push(
        "Invalid transaction_hash format (must be 0x + 64 hex characters)"
      );
    }

    // Validate status
    if (data.status) {
      const validStatuses = [
        "Active",
        "Inactive",
        "Pending",
        "Verified",
        "Rejected",
      ];
      if (!validStatuses.includes(data.status)) {
        errors.push(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        );
      }
    }

    if (errors.length > 0) {
      throw new ValidationError("Agricultural data validation failed", errors);
    }
  }

  /**
   * Create new agricultural data record with validation
   */
  async createAgriculturalData(dataToCreate) {
    try {
      // Validate data
      this.validateAgriculturalData(dataToCreate);

      // Set default values
      const dataToInsert = {
        ...dataToCreate,
        quality: dataToCreate.quality || "Standard",
        has_files: dataToCreate.has_files || false,
        file_count: dataToCreate.file_count || 0,
        total_file_size: dataToCreate.total_file_size || 0,
        status: dataToCreate.status || "Active",
        version: dataToCreate.version || "1.0",
        created_date: new Date(),
        updated_date: new Date(),
      };

      const result = await this.create(dataToInsert);
      logger.info("Agricultural data created successfully", {
        data_id: result.data_id,
        farmer_id: result.farmer_id,
      });

      return result;
    } catch (error) {
      logger.error("Error creating agricultural data", {
        dataToCreate,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update agricultural data with validation
   */
  async updateAgriculturalData(dataId, updateData) {
    try {
      // Validate update data
      this.validateAgriculturalData(updateData, true);

      // Check if data exists
      const existingData = await this.findById(dataId);
      if (!existingData) {
        throw new ValidationError(
          `Agricultural data with ID ${dataId} not found`
        );
      }

      // Add updated_date timestamp
      updateData.updated_date = new Date();

      const result = await this.update(dataId, updateData);
      logger.info("Agricultural data updated successfully", {
        data_id: dataId,
      });

      return result;
    } catch (error) {
      logger.error("Error updating agricultural data", {
        dataId,
        updateData,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find agricultural data by farmer ID
   */
  async findByFarmerId(
    farmerId,
    page = 1,
    pageSize = 10,
    orderBy = "harvest_date DESC"
  ) {
    try {
      const offset = (page - 1) * pageSize;
      const conditions = { farmer_id: farmerId, status: "Active" };

      const [data, total] = await Promise.all([
        this.findAll(conditions, orderBy, pageSize, offset),
        this.count(conditions),
      ]);

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      logger.error("Error finding agricultural data by farmer ID", {
        farmerId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find agricultural data by product type
   */
  async findByProductType(productType, page = 1, pageSize = 10) {
    try {
      const offset = (page - 1) * pageSize;
      const conditions = { product_type: productType, status: "Active" };

      const [data, total] = await Promise.all([
        this.findAll(conditions, "harvest_date DESC", pageSize, offset),
        this.count(conditions),
      ]);

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      logger.error("Error finding agricultural data by product type", {
        productType,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find agricultural data by transaction hash
   */
  async findByTransactionHash(transactionHash) {
    try {
      const query =
        "SELECT * FROM agricultural_data WHERE transaction_hash = @transactionHash";
      const result = await this.executeQuery(query, { transactionHash });
      return result[0] || null;
    } catch (error) {
      logger.error("Error finding agricultural data by transaction hash", {
        transactionHash,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find agricultural data by data hash
   */
  async findByDataHash(dataHash) {
    try {
      const query =
        "SELECT * FROM agricultural_data WHERE data_hash = @dataHash";
      const result = await this.executeQuery(query, { dataHash });
      return result[0] || null;
    } catch (error) {
      logger.error("Error finding agricultural data by data hash", {
        dataHash,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get complete agricultural data with farmer and file information
   */
  async getCompleteData(dataId) {
    try {
      const query = `
        SELECT * FROM vw_agricultural_data_complete 
        WHERE data_id = @dataId
      `;

      const result = await this.executeQuery(query, { dataId });
      return result[0] || null;
    } catch (error) {
      logger.error("Error getting complete agricultural data", {
        dataId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Search agricultural data with filters
   */
  async searchData(filters = {}, page = 1, pageSize = 10) {
    try {
      const offset = (page - 1) * pageSize;
      let whereClause = "WHERE status = @status";
      const parameters = {
        status: "Active",
        offset,
        pageSize,
      };

      // Build dynamic WHERE clause
      if (filters.farmer_id) {
        whereClause += " AND farmer_id = @farmer_id";
        parameters.farmer_id = filters.farmer_id;
      }

      if (filters.product_type) {
        whereClause += " AND product_type LIKE @product_type";
        parameters.product_type = `%${filters.product_type}%`;
      }

      if (filters.location) {
        whereClause += " AND location LIKE @location";
        parameters.location = `%${filters.location}%`;
      }

      if (filters.quality) {
        whereClause += " AND quality = @quality";
        parameters.quality = filters.quality;
      }

      if (filters.start_date) {
        whereClause += " AND harvest_date >= @start_date";
        parameters.start_date = filters.start_date;
      }

      if (filters.end_date) {
        whereClause += " AND harvest_date <= @end_date";
        parameters.end_date = filters.end_date;
      }

      if (filters.has_files !== undefined) {
        whereClause += " AND has_files = @has_files";
        parameters.has_files = filters.has_files;
      }

      if (filters.min_quantity) {
        whereClause += " AND quantity >= @min_quantity";
        parameters.min_quantity = filters.min_quantity;
      }

      if (filters.max_quantity) {
        whereClause += " AND quantity <= @max_quantity";
        parameters.max_quantity = filters.max_quantity;
      }

      const orderBy = filters.order_by || "harvest_date DESC";

      const query = `
        SELECT * FROM agricultural_data 
        ${whereClause}
        ORDER BY ${orderBy}
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `;

      const countQuery = `
        SELECT COUNT(*) as total FROM agricultural_data 
        ${whereClause}
      `;

      const [data, countResult] = await Promise.all([
        this.executeQuery(query, parameters),
        this.executeQuery(countQuery, {
          ...parameters,
          offset: undefined,
          pageSize: undefined,
        }),
      ]);

      return {
        data,
        total: countResult[0].total,
        page,
        pageSize,
        totalPages: Math.ceil(countResult[0].total / pageSize),
        filters,
      };
    } catch (error) {
      logger.error("Error searching agricultural data", {
        filters,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get agricultural data statistics
   */
  async getStatistics(farmerId = null, startDate = null, endDate = null) {
    try {
      let whereClause = "WHERE status = @status";
      const parameters = { status: "Active" };

      if (farmerId) {
        whereClause += " AND farmer_id = @farmer_id";
        parameters.farmer_id = farmerId;
      }

      if (startDate) {
        whereClause += " AND harvest_date >= @start_date";
        parameters.start_date = startDate;
      }

      if (endDate) {
        whereClause += " AND harvest_date <= @end_date";
        parameters.end_date = endDate;
      }

      const query = `
        SELECT 
          COUNT(*) as total_records,
          COUNT(CASE WHEN has_files = 1 THEN 1 END) as records_with_files,
          COUNT(DISTINCT farmer_id) as unique_farmers,
          COUNT(DISTINCT product_type) as unique_products,
          COUNT(DISTINCT location) as unique_locations,
          SUM(CASE WHEN quantity IS NOT NULL THEN quantity ELSE 0 END) as total_quantity,
          AVG(CASE WHEN quantity IS NOT NULL THEN quantity ELSE NULL END) as avg_quantity,
          SUM(file_count) as total_files,
          SUM(total_file_size) / 1024.0 / 1024.0 as total_size_mb,
          MIN(harvest_date) as earliest_harvest,
          MAX(harvest_date) as latest_harvest
        FROM agricultural_data 
        ${whereClause}
      `;

      const result = await this.executeQuery(query, parameters);
      return result[0];
    } catch (error) {
      logger.error("Error getting agricultural data statistics", {
        farmerId,
        startDate,
        endDate,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get data integrity report
   */
  async getDataIntegrityReport(startDate = null, endDate = null) {
    try {
      const query = `
        EXEC GetDataIntegrityReport @StartDate = @startDate, @EndDate = @endDate
      `;

      return await this.executeQuery(query, { startDate, endDate });
    } catch (error) {
      logger.error("Error getting data integrity report", {
        startDate,
        endDate,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get most productive farmers
   */
  async getMostProductiveFarmers(limit = 10, startDate = null, endDate = null) {
    try {
      let whereClause = "WHERE ad.status = @status";
      const parameters = { status: "Active", limit };

      if (startDate) {
        whereClause += " AND ad.harvest_date >= @start_date";
        parameters.start_date = startDate;
      }

      if (endDate) {
        whereClause += " AND ad.harvest_date <= @end_date";
        parameters.end_date = endDate;
      }

      const query = `
        SELECT TOP (@limit)
          ad.farmer_id,
          f.full_name as farmer_name,
          f.province,
          COUNT(ad.data_id) as total_records,
          SUM(CASE WHEN ad.quantity IS NOT NULL THEN ad.quantity ELSE 0 END) as total_quantity,
          COUNT(DISTINCT ad.product_type) as unique_products,
          MAX(ad.harvest_date) as last_harvest_date
        FROM agricultural_data ad
        LEFT JOIN farmers f ON ad.farmer_id = f.farmer_id
        ${whereClause}
        GROUP BY ad.farmer_id, f.full_name, f.province
        ORDER BY total_records DESC, total_quantity DESC
      `;

      return await this.executeQuery(query, parameters);
    } catch (error) {
      logger.error("Error getting most productive farmers", {
        limit,
        startDate,
        endDate,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get most produced products
   */
  async getMostProducedProducts(limit = 10, startDate = null, endDate = null) {
    try {
      let whereClause = "WHERE status = @status";
      const parameters = { status: "Active", limit };

      if (startDate) {
        whereClause += " AND harvest_date >= @start_date";
        parameters.start_date = startDate;
      }

      if (endDate) {
        whereClause += " AND harvest_date <= @end_date";
        parameters.end_date = endDate;
      }

      const query = `
        SELECT TOP (@limit)
          product_type,
          COUNT(*) as total_records,
          COUNT(DISTINCT farmer_id) as unique_farmers,
          SUM(CASE WHEN quantity IS NOT NULL THEN quantity ELSE 0 END) as total_quantity,
          AVG(CASE WHEN quantity IS NOT NULL THEN quantity ELSE NULL END) as avg_quantity,
          MIN(harvest_date) as first_harvest,
          MAX(harvest_date) as last_harvest
        FROM agricultural_data 
        ${whereClause}
        GROUP BY product_type
        ORDER BY total_records DESC, total_quantity DESC
      `;

      return await this.executeQuery(query, parameters);
    } catch (error) {
      logger.error("Error getting most produced products", {
        limit,
        startDate,
        endDate,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update file information for agricultural data
   */
  async updateFileInfo(dataId, fileCount, totalSize) {
    try {
      const updateData = {
        has_files: fileCount > 0,
        file_count: fileCount,
        total_file_size: totalSize,
        updated_date: new Date(),
      };

      const result = await this.update(dataId, updateData);
      logger.info("File information updated for agricultural data", {
        data_id: dataId,
        file_count: fileCount,
        total_size: totalSize,
      });

      return result;
    } catch (error) {
      logger.error("Error updating file information", {
        dataId,
        fileCount,
        totalSize,
        error: error.message,
      });
      throw error;
    }
  }
}

// Export singleton instance
export const AgriculturalData = new AgriculturalDataModel();
