/**
 * Validation middleware for request validation
 * Provides common validation functions and middleware
 */

import { ValidationError } from "./error.middleware.js";

/**
 * Validate required fields in request body
 * @param {Array} requiredFields - Array of required field names
 * @returns {Function} - Express middleware function
 */
export const validateRequiredFields = (requiredFields, source = "body") => {
  return (req, res, next) => {
    const data = req[source] || {};
    const missingFields = requiredFields.filter(
      (field) =>
        data[field] === undefined || data[field] === null || data[field] === ""
    );

    if (missingFields.length) {
      return next(
        new ValidationError(
          `Missing required fields: ${missingFields.join(", ")}`,
          missingFields
        )
      );
    }

    next();
  };
};

/**
 * Validate Ethereum address format
 * @param {string} address - Address to validate
 * @returns {boolean} - True if valid
 */
export const isValidEthereumAddress = (address) => {
  const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethereumAddressRegex.test(address);
};

/**
 * Validate transaction hash format
 * @param {string} hash - Hash to validate
 * @returns {boolean} - True if valid
 */
export const isValidTransactionHash = (hash) => {
  const hashRegex = /^0x[a-fA-F0-9]{64}$/;
  return hashRegex.test(hash);
};

/**
 * Validate Ethereum address in request parameters
 * @param {string} paramName - Parameter name to validate (default: 'address')
 * @returns {Function} - Express middleware function
 */
export const validateEthereumAddress = (paramName = "address") => {
  return (req, res, next) => {
    try {
      const address = req.params[paramName] || req.body[paramName];

      if (!address) {
        throw new ValidationError(`${paramName} is required`);
      }

      if (!isValidEthereumAddress(address)) {
        throw new ValidationError(
          `Invalid Ethereum address format for ${paramName}: ${address}`
        );
      }

      next();
    } catch (error) {
      // Log the validation error for debugging
      console.log(`Validation error for ${paramName}:`, {
        paramName,
        address: req.params[paramName] || req.body[paramName],
        error: error.message,
      });
      throw error;
    }
  };
};

/**
 * Validate transaction hash in request parameters
 * @param {string} paramName - Parameter name to validate (default: 'hash')
 * @returns {Function} - Express middleware function
 */
export const validateTransactionHash = (paramName = "hash") => {
  return (req, res, next) => {
    const hash = req.params[paramName] || req.body[paramName];

    if (!hash) {
      throw new ValidationError(`${paramName} is required`);
    }

    if (!isValidTransactionHash(hash)) {
      throw new ValidationError(
        `Invalid transaction hash format for ${paramName}`
      );
    }

    next();
  };
};

/**
 * Validate numeric values
 * @param {string} fieldName - Field name to validate
 * @param {Object} options - Validation options (min, max, required)
 * @returns {Function} - Express middleware function
 */
export const validateNumber = (fieldName, options = {}) => {
  const { min, max, required = true } = options;

  return (req, res, next) => {
    const value = req.body[fieldName] || req.params[fieldName];

    if (required && (value === undefined || value === null)) {
      throw new ValidationError(`${fieldName} is required`);
    }

    if (value !== undefined && value !== null) {
      const numValue = Number(value);

      if (isNaN(numValue)) {
        throw new ValidationError(`${fieldName} must be a valid number`);
      }

      if (min !== undefined && numValue < min) {
        throw new ValidationError(`${fieldName} must be at least ${min}`);
      }

      if (max !== undefined && numValue > max) {
        throw new ValidationError(`${fieldName} must be at most ${max}`);
      }
    }

    next();
  };
};

/**
 * Validate string values
 * @param {string} fieldName - Field name to validate
 * @param {Object} options - Validation options (minLength, maxLength, required, pattern)
 * @returns {Function} - Express middleware function
 */
export const validateString = (fieldName, options = {}) => {
  const { minLength, maxLength, required = true, pattern } = options;

  return (req, res, next) => {
    const value = req.body[fieldName] || req.params[fieldName];

    if (required && !value) {
      throw new ValidationError(`${fieldName} is required`);
    }

    if (value) {
      if (typeof value !== "string") {
        throw new ValidationError(`${fieldName} must be a string`);
      }

      if (minLength && value.length < minLength) {
        throw new ValidationError(
          `${fieldName} must be at least ${minLength} characters long`
        );
      }

      if (maxLength && value.length > maxLength) {
        throw new ValidationError(
          `${fieldName} must be at most ${maxLength} characters long`
        );
      }

      if (pattern && !pattern.test(value)) {
        throw new ValidationError(`${fieldName} format is invalid`);
      }
    }

    next();
  };
};

/**
 * Validate agricultural data fields
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
export const validateAgriData = (req, res, next) => {
  try {
    const { farmerId, productType, location } = req.body;

    // Required fields validation
    if (!farmerId || !productType || !location) {
      throw new ValidationError(
        "Missing required fields: farmerId, productType, location"
      );
    }

    // Field type validation
    if (typeof farmerId !== "string" || farmerId.trim().length === 0) {
      throw new ValidationError("farmerId must be a non-empty string");
    }

    if (typeof productType !== "string" || productType.trim().length === 0) {
      throw new ValidationError("productType must be a non-empty string");
    }

    if (typeof location !== "string" || location.trim().length === 0) {
      throw new ValidationError("location must be a non-empty string");
    }

    // Optional field validation
    if (req.body.quantity && isNaN(parseFloat(req.body.quantity))) {
      throw new ValidationError("quantity must be a valid number");
    }

    if (req.body.harvestDate && isNaN(Date.parse(req.body.harvestDate))) {
      throw new ValidationError("harvestDate must be a valid date");
    }

    next();
  } catch (error) {
    next(error);
  }
};
