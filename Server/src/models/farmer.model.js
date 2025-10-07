/**
 * Farmer Model - Handles farmer data operations
 * Maps to 'farmers' table in database
 */

import { BaseModel } from "./base.model.js";
import { ValidationError } from "../middlewares/error.middleware.js";
import { logger } from "../utils/logger.js";

class FarmerModel extends BaseModel {
  constructor() {
    super("farmers", "farmer_id");
  }

  /**
   * Validate farmer data before create/update
   */
  validateFarmerData(data, isUpdate = false) {
    const errors = [];

    // Required fields for creation
    if (!isUpdate) {
      if (!data.farmer_id) errors.push("farmer_id is required");
      if (!data.full_name) errors.push("full_name is required");
    }

    // Validate email format if provided
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push("Invalid email format");
      }
    }

    // Validate phone format if provided
    if (data.phone) {
      const phoneRegex = /^[0-9+\-\s()]+$/;
      if (!phoneRegex.test(data.phone)) {
        errors.push("Invalid phone number format");
      }
    }

    // Validate certification level
    if (data.certification_level) {
      const validLevels = [
        "Standard",
        "VietGAP",
        "Organic",
        "HACCP",
        "GlobalGAP",
      ];
      if (!validLevels.includes(data.certification_level)) {
        errors.push(
          `Invalid certification level. Must be one of: ${validLevels.join(
            ", "
          )}`
        );
      }
    }

    // Validate wallet address format
    if (data.wallet_address) {
      const walletRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!walletRegex.test(data.wallet_address)) {
        errors.push("Invalid wallet address format");
      }
    }

    if (errors.length > 0) {
      throw new ValidationError("Farmer validation failed", errors);
    }
  }

  /**
   * Create new farmer with validation
   */
  async createFarmer(farmerData) {
    try {
      // Validate data
      this.validateFarmerData(farmerData);

      // Check if farmer_id already exists
      const existingFarmer = await this.findById(farmerData.farmer_id);
      if (existingFarmer) {
        throw new ValidationError(
          `Farmer with ID ${farmerData.farmer_id} already exists`
        );
      }

      // Check if email already exists
      if (farmerData.email) {
        const emailExists = await this.findByEmail(farmerData.email);
        if (emailExists) {
          throw new ValidationError(
            `Email ${farmerData.email} is already registered`
          );
        }
      }

      // Set default values
      const dataToInsert = {
        ...farmerData,
        certification_level: farmerData.certification_level || "Standard",
        is_active:
          farmerData.is_active !== undefined ? farmerData.is_active : true,
        registration_date: new Date(),
        last_updated: new Date(),
      };

      const result = await this.create(dataToInsert);
      logger.info("Farmer created successfully", {
        farmer_id: result.farmer_id,
      });

      return result;
    } catch (error) {
      logger.error("Error creating farmer", {
        farmerData,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update farmer with validation
   */
  async updateFarmer(farmerId, updateData) {
    try {
      // Validate update data
      this.validateFarmerData(updateData, true);

      // Check if farmer exists
      const existingFarmer = await this.findById(farmerId);
      if (!existingFarmer) {
        throw new ValidationError(`Farmer with ID ${farmerId} not found`);
      }

      // Check email uniqueness if email is being updated
      if (updateData.email && updateData.email !== existingFarmer.email) {
        const emailExists = await this.findByEmail(updateData.email);
        if (emailExists) {
          throw new ValidationError(
            `Email ${updateData.email} is already registered`
          );
        }
      }

      // Add last_updated timestamp
      updateData.last_updated = new Date();

      const result = await this.update(farmerId, updateData);
      logger.info("Farmer updated successfully", { farmer_id: farmerId });

      return result;
    } catch (error) {
      logger.error("Error updating farmer", {
        farmerId,
        updateData,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find farmer by email
   */
  async findByEmail(email) {
    try {
      const query = "SELECT * FROM farmers WHERE email = @email";
      const result = await this.executeQuery(query, { email });
      return result[0] || null;
    } catch (error) {
      logger.error("Error finding farmer by email", {
        email,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find farmers by province
   */
  async findByProvince(province, limit = null, offset = null) {
    try {
      return await this.findAll(
        { province, is_active: true },
        "full_name ASC",
        limit,
        offset
      );
    } catch (error) {
      logger.error("Error finding farmers by province", {
        province,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find farmers by certification level
   */
  async findByCertification(certificationLevel, limit = null, offset = null) {
    try {
      return await this.findAll(
        { certification_level: certificationLevel, is_active: true },
        "full_name ASC",
        limit,
        offset
      );
    } catch (error) {
      logger.error("Error finding farmers by certification", {
        certificationLevel,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get farmer statistics including agricultural data count
   */
  async getFarmerStatistics(farmerId = null) {
    try {
      const query = `
        EXEC GetFarmerStatistics @FarmerId = @farmerId
      `;

      const result = await this.executeQuery(query, { farmerId });
      return result;
    } catch (error) {
      logger.error("Error getting farmer statistics", {
        farmerId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get active farmers with pagination
   */
  async getActiveFarmers(page = 1, pageSize = 10, searchTerm = null) {
    try {
      const offset = (page - 1) * pageSize;
      let conditions = { is_active: true };
      let orderBy = "full_name ASC";

      // If search term provided, use custom query
      if (searchTerm) {
        const query = `
          SELECT * FROM farmers 
          WHERE is_active = 1 
          AND (
            full_name LIKE @searchTerm OR 
            email LIKE @searchTerm OR 
            farmer_id LIKE @searchTerm OR
            province LIKE @searchTerm
          )
          ORDER BY ${orderBy}
          OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
        `;

        const countQuery = `
          SELECT COUNT(*) as total FROM farmers 
          WHERE is_active = 1 
          AND (
            full_name LIKE @searchTerm OR 
            email LIKE @searchTerm OR 
            farmer_id LIKE @searchTerm OR
            province LIKE @searchTerm
          )
        `;

        const searchPattern = `%${searchTerm}%`;
        const [farmers, countResult] = await Promise.all([
          this.executeQuery(query, {
            searchTerm: searchPattern,
            offset,
            pageSize,
          }),
          this.executeQuery(countQuery, { searchTerm: searchPattern }),
        ]);

        return {
          farmers,
          total: countResult[0].total,
          page,
          pageSize,
          totalPages: Math.ceil(countResult[0].total / pageSize),
        };
      }

      // Regular pagination without search
      const [farmers, total] = await Promise.all([
        this.findAll(conditions, orderBy, pageSize, offset),
        this.count(conditions),
      ]);

      return {
        farmers,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      logger.error("Error getting active farmers", {
        page,
        pageSize,
        searchTerm,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Deactivate farmer (soft delete)
   */
  async deactivateFarmer(farmerId) {
    try {
      const result = await this.update(farmerId, {
        is_active: false,
        last_updated: new Date(),
      });

      logger.info("Farmer deactivated successfully", { farmer_id: farmerId });
      return result;
    } catch (error) {
      logger.error("Error deactivating farmer", {
        farmerId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Activate farmer
   */
  async activateFarmer(farmerId) {
    try {
      const result = await this.update(farmerId, {
        is_active: true,
        last_updated: new Date(),
      });

      logger.info("Farmer activated successfully", { farmer_id: farmerId });
      return result;
    } catch (error) {
      logger.error("Error activating farmer", {
        farmerId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get farmers summary by province
   */
  async getFarmersSummaryByProvince() {
    try {
      const query = `
        SELECT 
          province,
          COUNT(*) as total_farmers,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_farmers,
          COUNT(CASE WHEN certification_level = 'Organic' THEN 1 END) as organic_farmers,
          COUNT(CASE WHEN certification_level = 'VietGAP' THEN 1 END) as vietgap_farmers
        FROM farmers
        GROUP BY province
        ORDER BY total_farmers DESC
      `;

      return await this.executeQuery(query);
    } catch (error) {
      logger.error("Error getting farmers summary by province", {
        error: error.message,
      });
      throw error;
    }
  }
}

// Export singleton instance
export const Farmer = new FarmerModel();
