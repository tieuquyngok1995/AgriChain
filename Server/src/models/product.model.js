/**
 * Product Model - Handles product data operations
 * Maps to 'products' table in database
 */

import { BaseModel } from "./base.model.js";
import { ValidationError } from "../middlewares/error.middleware.js";
import { logger } from "../utils/logger.js";

class ProductModel extends BaseModel {
  constructor() {
    super("products", "product_id");
  }

  /**
   * Validate product data before create/update
   */
  validateProductData(data, isUpdate = false) {
    const errors = [];

    // Required fields for creation
    if (!isUpdate) {
      if (!data.product_code) errors.push("product_code is required");
      if (!data.product_name) errors.push("product_name is required");
      if (!data.category) errors.push("category is required");
    }

    // Validate product code format (alphanumeric with underscores)
    if (data.product_code) {
      const codeRegex = /^[A-Z0-9_]+$/;
      if (!codeRegex.test(data.product_code)) {
        errors.push(
          "Product code must be uppercase alphanumeric with underscores only"
        );
      }
    }

    // Validate standard unit
    if (data.standard_unit) {
      const validUnits = [
        "kg",
        "g",
        "ton",
        "liter",
        "ml",
        "piece",
        "box",
        "bunch",
        "bag",
      ];
      if (!validUnits.includes(data.standard_unit)) {
        errors.push(
          `Invalid standard unit. Must be one of: ${validUnits.join(", ")}`
        );
      }
    }

    // Validate category
    if (data.category) {
      const validCategories = [
        "Grains",
        "Vegetables",
        "Fruits",
        "Beverages",
        "Spices",
        "Herbs",
        "Nuts",
        "Seeds",
        "Dairy",
        "Meat",
        "Fish",
        "Other",
      ];
      if (!validCategories.includes(data.category)) {
        errors.push(
          `Invalid category. Must be one of: ${validCategories.join(", ")}`
        );
      }
    }

    if (errors.length > 0) {
      throw new ValidationError("Product validation failed", errors);
    }
  }

  /**
   * Create new product with validation
   */
  async createProduct(productData) {
    try {
      // Validate data
      this.validateProductData(productData);

      // Check if product_code already exists
      const existingProduct = await this.findByCode(productData.product_code);
      if (existingProduct) {
        throw new ValidationError(
          `Product with code ${productData.product_code} already exists`
        );
      }

      // Set default values
      const dataToInsert = {
        ...productData,
        standard_unit: productData.standard_unit || "kg",
        is_active:
          productData.is_active !== undefined ? productData.is_active : true,
        created_date: new Date(),
      };

      const result = await this.create(dataToInsert);
      logger.info("Product created successfully", {
        product_id: result.product_id,
        product_code: result.product_code,
      });

      return result;
    } catch (error) {
      logger.error("Error creating product", {
        productData,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update product with validation
   */
  async updateProduct(productId, updateData) {
    try {
      // Validate update data
      this.validateProductData(updateData, true);

      // Check if product exists
      const existingProduct = await this.findById(productId);
      if (!existingProduct) {
        throw new ValidationError(`Product with ID ${productId} not found`);
      }

      // Check product code uniqueness if code is being updated
      if (
        updateData.product_code &&
        updateData.product_code !== existingProduct.product_code
      ) {
        const codeExists = await this.findByCode(updateData.product_code);
        if (codeExists) {
          throw new ValidationError(
            `Product code ${updateData.product_code} is already in use`
          );
        }
      }

      const result = await this.update(productId, updateData);
      logger.info("Product updated successfully", { product_id: productId });

      return result;
    } catch (error) {
      logger.error("Error updating product", {
        productId,
        updateData,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find product by product code
   */
  async findByCode(productCode) {
    try {
      const query = "SELECT * FROM products WHERE product_code = @productCode";
      const result = await this.executeQuery(query, { productCode });
      return result[0] || null;
    } catch (error) {
      logger.error("Error finding product by code", {
        productCode,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find products by category
   */
  async findByCategory(category, limit = null, offset = null) {
    try {
      return await this.findAll(
        { category, is_active: true },
        "product_name ASC",
        limit,
        offset
      );
    } catch (error) {
      logger.error("Error finding products by category", {
        category,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find products by sub-category
   */
  async findBySubCategory(subCategory, limit = null, offset = null) {
    try {
      return await this.findAll(
        { sub_category: subCategory, is_active: true },
        "product_name ASC",
        limit,
        offset
      );
    } catch (error) {
      logger.error("Error finding products by sub-category", {
        subCategory,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get active products with pagination and search
   */
  async getActiveProducts(
    page = 1,
    pageSize = 10,
    searchTerm = null,
    category = null
  ) {
    try {
      const offset = (page - 1) * pageSize;
      let conditions = { is_active: true };
      let orderBy = "product_name ASC";

      // Build query with search and category filter
      let whereClause = "WHERE is_active = 1";
      const parameters = { offset, pageSize };

      if (category) {
        whereClause += " AND category = @category";
        parameters.category = category;
      }

      if (searchTerm) {
        whereClause +=
          " AND (product_name LIKE @searchTerm OR product_code LIKE @searchTerm OR description LIKE @searchTerm)";
        parameters.searchTerm = `%${searchTerm}%`;
      }

      const query = `
        SELECT * FROM products 
        ${whereClause}
        ORDER BY ${orderBy}
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `;

      const countQuery = `
        SELECT COUNT(*) as total FROM products 
        ${whereClause}
      `;

      const [products, countResult] = await Promise.all([
        this.executeQuery(query, parameters),
        this.executeQuery(countQuery, {
          ...parameters,
          offset: undefined,
          pageSize: undefined,
        }),
      ]);

      return {
        products,
        total: countResult[0].total,
        page,
        pageSize,
        totalPages: Math.ceil(countResult[0].total / pageSize),
      };
    } catch (error) {
      logger.error("Error getting active products", {
        page,
        pageSize,
        searchTerm,
        category,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get all categories with product counts
   */
  async getCategories() {
    try {
      const query = `
        SELECT 
          category,
          COUNT(*) as total_products,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_products
        FROM products
        GROUP BY category
        ORDER BY category ASC
      `;

      return await this.executeQuery(query);
    } catch (error) {
      logger.error("Error getting product categories", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get sub-categories by category
   */
  async getSubCategoriesByCategory(category) {
    try {
      const query = `
        SELECT DISTINCT sub_category
        FROM products
        WHERE category = @category AND sub_category IS NOT NULL AND is_active = 1
        ORDER BY sub_category ASC
      `;

      const result = await this.executeQuery(query, { category });
      return result.map((row) => row.sub_category);
    } catch (error) {
      logger.error("Error getting sub-categories", {
        category,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get products summary
   */
  async getProductsSummary() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_products,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_products,
          COUNT(DISTINCT category) as total_categories,
          COUNT(DISTINCT sub_category) as total_subcategories
        FROM products
      `;

      const result = await this.executeQuery(query);
      return result[0];
    } catch (error) {
      logger.error("Error getting products summary", { error: error.message });
      throw error;
    }
  }

  /**
   * Deactivate product (soft delete)
   */
  async deactivateProduct(productId) {
    try {
      const result = await this.update(productId, { is_active: false });
      logger.info("Product deactivated successfully", {
        product_id: productId,
      });
      return result;
    } catch (error) {
      logger.error("Error deactivating product", {
        productId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Activate product
   */
  async activateProduct(productId) {
    try {
      const result = await this.update(productId, { is_active: true });
      logger.info("Product activated successfully", { product_id: productId });
      return result;
    } catch (error) {
      logger.error("Error activating product", {
        productId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Search products with full text search
   */
  async searchProducts(searchTerm, limit = 20) {
    try {
      const query = `
        SELECT TOP (@limit) *
        FROM products
        WHERE is_active = 1
        AND (
          product_name LIKE @searchTerm OR 
          product_code LIKE @searchTerm OR 
          description LIKE @searchTerm OR
          category LIKE @searchTerm OR
          sub_category LIKE @searchTerm
        )
        ORDER BY 
          CASE 
            WHEN product_name LIKE @exactTerm THEN 1
            WHEN product_code LIKE @exactTerm THEN 2
            WHEN product_name LIKE @searchTerm THEN 3
            ELSE 4
          END,
          product_name ASC
      `;

      const searchPattern = `%${searchTerm}%`;
      const exactPattern = searchTerm;

      return await this.executeQuery(query, {
        searchTerm: searchPattern,
        exactTerm: exactPattern,
        limit,
      });
    } catch (error) {
      logger.error("Error searching products", {
        searchTerm,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get most used products in agricultural data
   */
  async getMostUsedProducts(limit = 10) {
    try {
      const query = `
        SELECT TOP (@limit)
          p.product_id,
          p.product_code,
          p.product_name,
          p.category,
          p.standard_unit,
          COUNT(ad.data_id) as usage_count,
          SUM(ad.quantity) as total_quantity
        FROM products p
        INNER JOIN agricultural_data ad ON p.product_name = ad.product_type
        WHERE p.is_active = 1 AND ad.status = 'Active'
        GROUP BY p.product_id, p.product_code, p.product_name, p.category, p.standard_unit
        ORDER BY usage_count DESC, total_quantity DESC
      `;

      return await this.executeQuery(query, { limit });
    } catch (error) {
      logger.error("Error getting most used products", {
        error: error.message,
      });
      throw error;
    }
  }
}

// Export singleton instance
export const Product = new ProductModel();
