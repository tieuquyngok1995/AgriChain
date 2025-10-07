/**
 * Error handling middleware for the entire AgriChain project
 * Handles different types of errors and provides consistent API responses
 */

import { logger } from "../utils/logger.js";

/**
 * Custom error class for blockchain-related errors
 */
export class BlockchainError extends Error {
  constructor(message, code = "BLOCKCHAIN_ERROR", statusCode = 500) {
    super(message);
    this.name = "BlockchainError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Custom error class for database-related errors
 */
export class DatabaseError extends Error {
  constructor(message, code = "DATABASE_ERROR", statusCode = 500) {
    super(message);
    this.name = "DatabaseError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  constructor(message, fields = [], statusCode = 400) {
    super(message);
    this.name = "ValidationError";
    this.code = "VALIDATION_ERROR";
    this.fields = fields;
    this.statusCode = statusCode;
  }
}

/**
 * Custom error class for authentication/authorization errors
 */
export class AuthError extends Error {
  constructor(message, code = "AUTH_ERROR", statusCode = 401) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Main error handling middleware
 * Processes all errors and returns standardized JSON responses
 */
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details
  logger.error("Error occurred in API", {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Handle specific error types
  if (err.name === "ValidationError") {
    return handleValidationError(err, res);
  }

  if (err.name === "BlockchainError") {
    return handleBlockchainError(err, res);
  }

  if (err.name === "DatabaseError") {
    return handleDatabaseError(err, res);
  }

  if (err.name === "AuthError") {
    return handleAuthError(err, res);
  }

  // Handle Ethereum/Blockchain specific errors
  if (err.code) {
    switch (err.code) {
      case "INSUFFICIENT_FUNDS":
        return res.status(400).json({
          success: false,
          error: "Insufficient funds for transaction",
          code: "INSUFFICIENT_FUNDS",
        });

      case "TRANSACTION_REVERTED":
        return res.status(400).json({
          success: false,
          error: "Transaction was reverted by the blockchain",
          code: "TRANSACTION_REVERTED",
        });

      case "NETWORK_ERROR":
        return res.status(503).json({
          success: false,
          error: "Blockchain network is unavailable",
          code: "NETWORK_ERROR",
        });

      case "INVALID_ARGUMENT":
        return res.status(400).json({
          success: false,
          error: "Invalid argument provided to blockchain function",
          code: "INVALID_ARGUMENT",
        });
    }
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      error: "Invalid JSON format in request body",
      code: "INVALID_JSON",
    });
  }

  // Default error response
  return res.status(error.statusCode || 500).json({
    success: false,
    error:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message,
    code: error.code || "INTERNAL_ERROR",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

/**
 * Handle validation errors
 */
const handleValidationError = (err, res) => {
  return res.status(err.statusCode || 400).json({
    success: false,
    error: err.message,
    code: "VALIDATION_ERROR",
    fields: err.fields || [],
  });
};

/**
 * Handle blockchain-related errors
 */
const handleBlockchainError = (err, res) => {
  return res.status(err.statusCode || 500).json({
    success: false,
    error: err.message,
    code: err.code || "BLOCKCHAIN_ERROR",
  });
};

/**
 * Handle database-related errors
 */
const handleDatabaseError = (err, res) => {
  return res.status(err.statusCode || 500).json({
    success: false,
    error: err.message,
    code: err.code || "DATABASE_ERROR",
  });
};

/**
 * Handle authentication/authorization errors
 */
const handleAuthError = (err, res) => {
  return res.status(err.statusCode || 401).json({
    success: false,
    error: err.message,
    code: err.code || "AUTH_ERROR",
  });
};

/**
 * Async error wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * 404 Not Found handler
 * Should be used after all routes are defined
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = 404;
  error.code = "ROUTE_NOT_FOUND";
  next(error);
};
