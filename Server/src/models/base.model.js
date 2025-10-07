/**
 * Base Model class for AgriChain application
 * Provides common functionality for all models including CRUD operations
 */

import { DatabaseService } from "../services/database.service.js";
import { logger } from "../utils/logger.js";
import {
  ValidationError,
  DatabaseError,
} from "../middlewares/error.middleware.js";

export class BaseModel {
  constructor(tableName, primaryKey = "id") {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
    this.db = DatabaseService;
  }

  /**
   * Find record by primary key
   */
  async findById(id) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = @id`;
      const result = await this.db.executeQuery(query, { id });
      return result.recordset[0] || null;
    } catch (error) {
      logger.error(`Error finding ${this.tableName} by ID`, {
        id,
        error: error.message,
      });
      throw new DatabaseError(
        `Failed to find ${this.tableName} by ID: ${error.message}`
      );
    }
  }

  /**
   * Find all records with optional filtering
   */
  async findAll(conditions = {}, orderBy = null, limit = null, offset = null) {
    try {
      let query = `SELECT * FROM ${this.tableName}`;
      const parameters = {};

      // Add WHERE conditions
      if (Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions)
          .map((key, index) => {
            parameters[`param${index}`] = conditions[key];
            return `${key} = @param${index}`;
          })
          .join(" AND ");
        query += ` WHERE ${whereClause}`;
      }

      // Add ORDER BY
      if (orderBy) {
        query += ` ORDER BY ${orderBy}`;
      }

      // Add OFFSET and FETCH for pagination
      if (limit) {
        if (!orderBy) {
          query += ` ORDER BY ${this.primaryKey}`;
        }
        query += ` OFFSET ${offset || 0} ROWS FETCH NEXT ${limit} ROWS ONLY`;
      }

      const result = await this.db.executeQuery(query, parameters);
      return result.recordset;
    } catch (error) {
      logger.error(`Error finding all ${this.tableName}`, {
        conditions,
        error: error.message,
      });
      throw new DatabaseError(
        `Failed to find ${this.tableName}: ${error.message}`
      );
    }
  }

  /**
   * Create new record
   */
  async create(data) {
    try {
      // Remove undefined values
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined)
      );

      const columns = Object.keys(cleanData);
      const values = Object.keys(cleanData).map((key) => `@${key}`);

      const query = `
        INSERT INTO ${this.tableName} (${columns.join(", ")})
        OUTPUT INSERTED.*
        VALUES (${values.join(", ")})
      `;

      const result = await this.db.executeQuery(query, cleanData);

      if (result.recordset.length === 0) {
        throw new DatabaseError("No record was created");
      }

      return result.recordset[0];
    } catch (error) {
      logger.error(`Error creating ${this.tableName}`, {
        data,
        error: error.message,
      });
      throw new DatabaseError(
        `Failed to create ${this.tableName}: ${error.message}`
      );
    }
  }

  /**
   * Update record by primary key
   */
  async update(id, data) {
    try {
      // Remove undefined values and primary key
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(
          ([key, value]) => value !== undefined && key !== this.primaryKey
        )
      );

      if (Object.keys(cleanData).length === 0) {
        throw new ValidationError("No valid fields to update");
      }

      const setClause = Object.keys(cleanData)
        .map((key) => `${key} = @${key}`)
        .join(", ");
      cleanData.id = id;

      const query = `
        UPDATE ${this.tableName} 
        SET ${setClause}
        OUTPUT INSERTED.*
        WHERE ${this.primaryKey} = @id
      `;

      const result = await this.db.executeQuery(query, cleanData);

      if (result.recordset.length === 0) {
        throw new DatabaseError(`${this.tableName} with ID ${id} not found`);
      }

      return result.recordset[0];
    } catch (error) {
      logger.error(`Error updating ${this.tableName}`, {
        id,
        data,
        error: error.message,
      });
      throw new DatabaseError(
        `Failed to update ${this.tableName}: ${error.message}`
      );
    }
  }

  /**
   * Delete record by primary key
   */
  async delete(id) {
    try {
      const query = `
        DELETE FROM ${this.tableName} 
        OUTPUT DELETED.*
        WHERE ${this.primaryKey} = @id
      `;

      const result = await this.db.executeQuery(query, { id });

      if (result.recordset.length === 0) {
        throw new DatabaseError(`${this.tableName} with ID ${id} not found`);
      }

      return result.recordset[0];
    } catch (error) {
      logger.error(`Error deleting ${this.tableName}`, {
        id,
        error: error.message,
      });
      throw new DatabaseError(
        `Failed to delete ${this.tableName}: ${error.message}`
      );
    }
  }

  /**
   * Count records with optional conditions
   */
  async count(conditions = {}) {
    try {
      let query = `SELECT COUNT(*) as total FROM ${this.tableName}`;
      const parameters = {};

      if (Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions)
          .map((key, index) => {
            parameters[`param${index}`] = conditions[key];
            return `${key} = @param${index}`;
          })
          .join(" AND ");
        query += ` WHERE ${whereClause}`;
      }

      const result = await this.db.executeQuery(query, parameters);
      return result.recordset[0].total;
    } catch (error) {
      logger.error(`Error counting ${this.tableName}`, {
        conditions,
        error: error.message,
      });
      throw new DatabaseError(
        `Failed to count ${this.tableName}: ${error.message}`
      );
    }
  }

  /**
   * Check if record exists
   */
  async exists(conditions) {
    try {
      const count = await this.count(conditions);
      return count > 0;
    } catch (error) {
      logger.error(`Error checking existence in ${this.tableName}`, {
        conditions,
        error: error.message,
      });
      throw new DatabaseError(
        `Failed to check existence in ${this.tableName}: ${error.message}`
      );
    }
  }

  /**
   * Execute custom query with parameters
   */
  async executeQuery(query, parameters = {}) {
    try {
      const result = await this.db.executeQuery(query, parameters);
      return result.recordset;
    } catch (error) {
      logger.error(`Error executing custom query on ${this.tableName}`, {
        query,
        error: error.message,
      });
      throw new DatabaseError(`Failed to execute query: ${error.message}`);
    }
  }
}
