/**
 * Models Index - Export all models for easy importing
 * Provides centralized access to all database models
 */

// Import all models
import { BaseModel } from "./base.model.js";
import { Farmer } from "./farmer.model.js";
import { Product } from "./product.model.js";
import { AgriculturalData } from "./agricultural-data.model.js";
import { UploadedFiles } from "./uploaded-files.model.js";
import { BlockchainTransactions } from "./blockchain-transactions.model.js";
import { VerificationLogs } from "./verification-logs.model.js";

// Export all models
export {
  BaseModel,
  Farmer,
  Product,
  AgriculturalData,
  UploadedFiles,
  BlockchainTransactions,
  VerificationLogs,
};

/**
 * Models object for destructuring import
 * Usage: import { models } from '../models/index.js';
 */
export const models = {
  BaseModel,
  Farmer,
  Product,
  AgriculturalData,
  UploadedFiles,
  BlockchainTransactions,
  VerificationLogs,
};

/**
 * Get all model instances
 */
export const getAllModels = () => {
  return {
    farmers: Farmer,
    products: Product,
    agriculturalData: AgriculturalData,
    uploadedFiles: UploadedFiles,
    blockchainTransactions: BlockchainTransactions,
    verificationLogs: VerificationLogs,
  };
};

/**
 * Model configuration for validation and metadata
 */
export const modelConfig = {
  farmers: {
    tableName: "farmers",
    primaryKey: "farmer_id",
    required: ["farmer_id", "full_name"],
    unique: ["farmer_id", "email", "wallet_address"],
  },
  products: {
    tableName: "products",
    primaryKey: "product_id",
    required: ["product_code", "product_name", "category"],
    unique: ["product_code"],
  },
  agriculturalData: {
    tableName: "agricultural_data",
    primaryKey: "data_id",
    required: [
      "farmer_id",
      "product_type",
      "location",
      "harvest_date",
      "data_hash",
      "transaction_hash",
    ],
    unique: ["data_hash", "transaction_hash"],
  },
  uploadedFiles: {
    tableName: "uploaded_files",
    primaryKey: "file_id",
    required: [
      "data_id",
      "original_name",
      "stored_filename",
      "file_path",
      "file_size",
      "mime_type",
      "file_hash",
    ],
    unique: ["file_hash"],
  },
  blockchainTransactions: {
    tableName: "blockchain_transactions",
    primaryKey: "transaction_id",
    required: ["transaction_hash", "from_address"],
    unique: ["transaction_hash"],
  },
  verificationLogs: {
    tableName: "verification_logs",
    primaryKey: "log_id",
    required: [
      "data_id",
      "transaction_hash",
      "verification_method",
      "is_valid",
      "stored_hash",
      "current_hash",
    ],
    unique: [],
  },
};

/**
 * Default values for models
 */
export const defaultValues = {
  farmers: {
    certification_level: "Standard",
    is_active: true,
  },
  products: {
    standard_unit: "kg",
    is_active: true,
  },
  agriculturalData: {
    quality: "Standard",
    status: "Active",
    version: "1.0",
    has_files: false,
    file_count: 0,
    total_file_size: 0,
  },
  uploadedFiles: {
    is_active: true,
  },
  blockchainTransactions: {
    network_name: "amoy",
    network_id: 80002,
    status: "Pending",
  },
  verificationLogs: {},
};
