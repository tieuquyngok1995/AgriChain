/**
 * Middleware exports for AgriChain application
 * Centralized export for all middleware functions
 */

// Error handling
export {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  BlockchainError,
  DatabaseError,
  ValidationError,
  AuthError,
} from "./error.middleware.js";

// Validation
export {
  validateRequiredFields,
  validateEthereumAddress,
  validateTransactionHash,
  validateNumber,
  validateString,
  isValidEthereumAddress,
  isValidTransactionHash,
} from "./validation.middleware.js";

// Rate limiting
export {
  rateLimiter,
  strictRateLimiter,
  blockchainRateLimiter,
} from "./rateLimiter.middleware.js";
