/**
 * Response utilities for consistent API responses
 * Provides standardized success and error response formats
 */

/**
 * Send success response
 * @param {Object} data - Data to send in response
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export const success = (data = null, message = "Success", statusCode = 200) => {
  const response = {
    success: true,
    message,
    data,
  };

  // Remove data field if null to keep response clean
  if (data === null) {
    delete response.data;
  }

  return {
    statusCode,
    response,
  };
};

/**
 * Send error response
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {Array} fields - Validation error fields (optional)
 */
export const error = (
  message = "Internal Server Error",
  code = "INTERNAL_ERROR",
  statusCode = 500,
  fields = null
) => {
  const response = {
    success: false,
    error: message,
    code,
  };

  // Add fields for validation errors
  if (fields && Array.isArray(fields) && fields.length > 0) {
    response.fields = fields;
  }

  return {
    statusCode,
    response,
  };
};

/**
 * Send paginated response
 * @param {Array} data - Data array
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items count
 * @param {string} message - Success message
 */
export const paginated = (data, page, limit, total, message = "Success") => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    statusCode: 200,
    response: {
      success: true,
      message,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    },
  };
};

/**
 * Helper function to send response
 * @param {Object} res - Express response object
 * @param {Object} responseData - Response data from success/error functions
 */
export const sendResponse = (res, responseData) => {
  return res.status(responseData.statusCode).json(responseData.response);
};
