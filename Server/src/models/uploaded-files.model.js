/**
 * Uploaded Files Model - Handles file upload data operations
 * Maps to 'uploaded_files' table in database
 */

import { BaseModel } from "./base.model.js";
import { ValidationError } from "../middlewares/error.middleware.js";
import { logger } from "../utils/logger.js";

class UploadedFilesModel extends BaseModel {
  constructor() {
    super("uploaded_files", "file_id");
  }

  /**
   * Validate uploaded file data before create/update
   */
  validateFileData(data, isUpdate = false) {
    const errors = [];

    // Required fields for creation
    if (!isUpdate) {
      if (!data.data_id) errors.push("data_id is required");
      if (!data.original_name) errors.push("original_name is required");
      if (!data.stored_filename) errors.push("stored_filename is required");
      if (!data.file_path) errors.push("file_path is required");
      if (!data.file_size) errors.push("file_size is required");
      if (!data.mime_type) errors.push("mime_type is required");
      if (!data.file_hash) errors.push("file_hash is required");
    }

    // Validate file size
    if (data.file_size !== undefined && data.file_size !== null) {
      if (data.file_size < 0) {
        errors.push("File size must be a positive number");
      }
      if (data.file_size > 100 * 1024 * 1024) {
        // 100MB limit
        errors.push("File size is too large (max: 100MB)");
      }
    }

    // Validate file hash format
    if (data.file_hash && !/^0x[a-fA-F0-9]{64}$/.test(data.file_hash)) {
      errors.push("Invalid file_hash format (must be 0x + 64 hex characters)");
    }

    // Validate mime type format
    if (
      data.mime_type &&
      !/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/.test(
        data.mime_type
      )
    ) {
      errors.push("Invalid mime_type format");
    }

    // Validate original name (basic filename validation)
    if (data.original_name && data.original_name.length > 255) {
      errors.push("Original filename is too long (max: 255 characters)");
    }

    if (errors.length > 0) {
      throw new ValidationError("File data validation failed", errors);
    }
  }

  /**
   * Create new file record with validation
   */
  async createFile(fileData) {
    try {
      // Validate data
      this.validateFileData(fileData);

      // Set default values
      const dataToInsert = {
        ...fileData,
        is_active: fileData.is_active !== undefined ? fileData.is_active : true,
        upload_date: new Date(),
      };

      const result = await this.create(dataToInsert);
      logger.info("File record created successfully", {
        file_id: result.file_id,
        data_id: result.data_id,
        original_name: result.original_name,
      });

      return result;
    } catch (error) {
      logger.error("Error creating file record", {
        fileData,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update file record with validation
   */
  async updateFile(fileId, updateData) {
    try {
      // Validate update data
      this.validateFileData(updateData, true);

      // Check if file exists
      const existingFile = await this.findById(fileId);
      if (!existingFile) {
        throw new ValidationError(`File with ID ${fileId} not found`);
      }

      const result = await this.update(fileId, updateData);
      logger.info("File record updated successfully", { file_id: fileId });

      return result;
    } catch (error) {
      logger.error("Error updating file record", {
        fileId,
        updateData,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find files by agricultural data ID
   */
  async findByDataId(dataId, includeInactive = false) {
    try {
      const conditions = { data_id: dataId };
      if (!includeInactive) {
        conditions.is_active = true;
      }

      return await this.findAll(conditions, "upload_date ASC");
    } catch (error) {
      logger.error("Error finding files by data ID", {
        dataId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find file by hash
   */
  async findByHash(fileHash) {
    try {
      const query =
        "SELECT * FROM uploaded_files WHERE file_hash = @fileHash AND is_active = 1";
      const result = await this.executeQuery(query, { fileHash });
      return result[0] || null;
    } catch (error) {
      logger.error("Error finding file by hash", {
        fileHash,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find files by mime type
   */
  async findByMimeType(mimeType, page = 1, pageSize = 10) {
    try {
      const offset = (page - 1) * pageSize;
      const conditions = { mime_type: mimeType, is_active: true };

      const [files, total] = await Promise.all([
        this.findAll(conditions, "upload_date DESC", pageSize, offset),
        this.count(conditions),
      ]);

      return {
        files,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      logger.error("Error finding files by mime type", {
        mimeType,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get file statistics for agricultural data
   */
  async getFileStatsByDataId(dataId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_files,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_files,
          SUM(file_size) as total_size,
          AVG(file_size) as avg_size,
          MIN(upload_date) as first_upload,
          MAX(upload_date) as last_upload,
          COUNT(DISTINCT mime_type) as unique_mime_types
        FROM uploaded_files 
        WHERE data_id = @dataId
      `;

      const result = await this.executeQuery(query, { dataId });
      return result[0];
    } catch (error) {
      logger.error("Error getting file statistics by data ID", {
        dataId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get all files with pagination and filters
   */
  async getAllFiles(page = 1, pageSize = 10, filters = {}) {
    try {
      const offset = (page - 1) * pageSize;
      let whereClause = "WHERE is_active = 1";
      const parameters = { offset, pageSize };

      // Build dynamic WHERE clause
      if (filters.data_id) {
        whereClause += " AND data_id = @data_id";
        parameters.data_id = filters.data_id;
      }

      if (filters.mime_type) {
        whereClause += " AND mime_type LIKE @mime_type";
        parameters.mime_type = `%${filters.mime_type}%`;
      }

      if (filters.original_name) {
        whereClause += " AND original_name LIKE @original_name";
        parameters.original_name = `%${filters.original_name}%`;
      }

      if (filters.min_size) {
        whereClause += " AND file_size >= @min_size";
        parameters.min_size = filters.min_size;
      }

      if (filters.max_size) {
        whereClause += " AND file_size <= @max_size";
        parameters.max_size = filters.max_size;
      }

      if (filters.start_date) {
        whereClause += " AND upload_date >= @start_date";
        parameters.start_date = filters.start_date;
      }

      if (filters.end_date) {
        whereClause += " AND upload_date <= @end_date";
        parameters.end_date = filters.end_date;
      }

      const orderBy = filters.order_by || "upload_date DESC";

      const query = `
        SELECT uf.*, ad.farmer_id, ad.product_type, ad.harvest_date
        FROM uploaded_files uf
        LEFT JOIN agricultural_data ad ON uf.data_id = ad.data_id
        ${whereClause}
        ORDER BY ${orderBy}
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `;

      const countQuery = `
        SELECT COUNT(*) as total 
        FROM uploaded_files uf
        LEFT JOIN agricultural_data ad ON uf.data_id = ad.data_id
        ${whereClause}
      `;

      const [files, countResult] = await Promise.all([
        this.executeQuery(query, parameters),
        this.executeQuery(countQuery, {
          ...parameters,
          offset: undefined,
          pageSize: undefined,
        }),
      ]);

      return {
        files,
        total: countResult[0].total,
        page,
        pageSize,
        totalPages: Math.ceil(countResult[0].total / pageSize),
        filters,
      };
    } catch (error) {
      logger.error("Error getting all files", {
        filters,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get file upload statistics
   */
  async getUploadStatistics(startDate = null, endDate = null) {
    try {
      let whereClause = "WHERE is_active = 1";
      const parameters = {};

      if (startDate) {
        whereClause += " AND upload_date >= @start_date";
        parameters.start_date = startDate;
      }

      if (endDate) {
        whereClause += " AND upload_date <= @end_date";
        parameters.end_date = endDate;
      }

      const query = `
        SELECT 
          COUNT(*) as total_files,
          COUNT(DISTINCT data_id) as data_records_with_files,
          SUM(file_size) / 1024.0 / 1024.0 as total_size_mb,
          AVG(file_size) / 1024.0 as avg_size_kb,
          MIN(file_size) as min_size,
          MAX(file_size) as max_size,
          COUNT(DISTINCT mime_type) as unique_mime_types,
          MIN(upload_date) as first_upload,
          MAX(upload_date) as last_upload
        FROM uploaded_files 
        ${whereClause}
      `;

      const result = await this.executeQuery(query, parameters);
      return result[0];
    } catch (error) {
      logger.error("Error getting upload statistics", {
        startDate,
        endDate,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get mime type distribution
   */
  async getMimeTypeDistribution() {
    try {
      const query = `
        SELECT 
          mime_type,
          COUNT(*) as file_count,
          SUM(file_size) / 1024.0 / 1024.0 as total_size_mb,
          AVG(file_size) / 1024.0 as avg_size_kb
        FROM uploaded_files 
        WHERE is_active = 1
        GROUP BY mime_type
        ORDER BY file_count DESC
      `;

      return await this.executeQuery(query);
    } catch (error) {
      logger.error("Error getting mime type distribution", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get files by date range
   */
  async getFilesByDateRange(startDate, endDate, page = 1, pageSize = 10) {
    try {
      const offset = (page - 1) * pageSize;

      const query = `
        SELECT uf.*, ad.farmer_id, ad.product_type
        FROM uploaded_files uf
        LEFT JOIN agricultural_data ad ON uf.data_id = ad.data_id
        WHERE uf.is_active = 1 
        AND uf.upload_date >= @startDate 
        AND uf.upload_date <= @endDate
        ORDER BY uf.upload_date DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM uploaded_files uf
        WHERE uf.is_active = 1 
        AND uf.upload_date >= @startDate 
        AND uf.upload_date <= @endDate
      `;

      const [files, countResult] = await Promise.all([
        this.executeQuery(query, { startDate, endDate, offset, pageSize }),
        this.executeQuery(countQuery, { startDate, endDate }),
      ]);

      return {
        files,
        total: countResult[0].total,
        page,
        pageSize,
        totalPages: Math.ceil(countResult[0].total / pageSize),
      };
    } catch (error) {
      logger.error("Error getting files by date range", {
        startDate,
        endDate,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete file (soft delete)
   */
  async deleteFile(fileId) {
    try {
      const result = await this.update(fileId, { is_active: false });
      logger.info("File deleted successfully", { file_id: fileId });
      return result;
    } catch (error) {
      logger.error("Error deleting file", { fileId, error: error.message });
      throw error;
    }
  }

  /**
   * Restore file
   */
  async restoreFile(fileId) {
    try {
      const result = await this.update(fileId, { is_active: true });
      logger.info("File restored successfully", { file_id: fileId });
      return result;
    } catch (error) {
      logger.error("Error restoring file", { fileId, error: error.message });
      throw error;
    }
  }

  /**
   * Get large files (above specified size)
   */
  async getLargeFiles(minSizeMB = 10, page = 1, pageSize = 10) {
    try {
      const offset = (page - 1) * pageSize;
      const minSizeBytes = minSizeMB * 1024 * 1024;

      const query = `
        SELECT uf.*, ad.farmer_id, ad.product_type,
               uf.file_size / 1024.0 / 1024.0 as size_mb
        FROM uploaded_files uf
        LEFT JOIN agricultural_data ad ON uf.data_id = ad.data_id
        WHERE uf.is_active = 1 AND uf.file_size >= @minSize
        ORDER BY uf.file_size DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM uploaded_files 
        WHERE is_active = 1 AND file_size >= @minSize
      `;

      const [files, countResult] = await Promise.all([
        this.executeQuery(query, { minSize: minSizeBytes, offset, pageSize }),
        this.executeQuery(countQuery, { minSize: minSizeBytes }),
      ]);

      return {
        files,
        total: countResult[0].total,
        page,
        pageSize,
        totalPages: Math.ceil(countResult[0].total / pageSize),
        minSizeMB,
      };
    } catch (error) {
      logger.error("Error getting large files", {
        minSizeMB,
        error: error.message,
      });
      throw error;
    }
  }
}

// Export singleton instance
export const UploadedFiles = new UploadedFilesModel();
