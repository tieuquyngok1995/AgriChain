/**
 * Rate limiting middleware for API protection
 * Prevents abuse and controls request frequency
 */

import { logger } from "../utils/logger.js";

// Store for tracking requests (in production, use Redis)
const requestStore = new Map();

/**
 * Rate limiter middleware
 * @param {Object} options - Rate limiting options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Maximum requests per window
 * @param {string} options.message - Error message when limit exceeded
 * @param {Array} options.skipPaths - Paths to skip rate limiting
 * @returns {Function} - Express middleware function
 */
export const rateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    message = "Too many requests, please try again later",
    skipPaths = [],
  } = options;

  return (req, res, next) => {
    // Skip rate limiting for specified paths
    if (skipPaths.some((path) => req.path.startsWith(path))) {
      return next();
    }

    const clientId = req.ip || req.connection.remoteAddress;
    const currentTime = Date.now();
    const windowStart = currentTime - windowMs;

    // Clean up old entries
    cleanupOldEntries(windowStart);

    // Get or create client record
    if (!requestStore.has(clientId)) {
      requestStore.set(clientId, []);
    }

    const clientRequests = requestStore.get(clientId);

    // Filter requests within current window
    const requestsInWindow = clientRequests.filter(
      (timestamp) => timestamp > windowStart
    );

    if (requestsInWindow.length >= maxRequests) {
      logger.warn("Rate limit exceeded", {
        clientId,
        path: req.path,
        method: req.method,
        requestCount: requestsInWindow.length,
      });

      return res.status(429).json({
        success: false,
        error: message,
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    // Add current request timestamp
    requestsInWindow.push(currentTime);
    requestStore.set(clientId, requestsInWindow);

    // Add rate limit headers
    res.set({
      "X-RateLimit-Limit": maxRequests.toString(),
      "X-RateLimit-Remaining": Math.max(
        0,
        maxRequests - requestsInWindow.length
      ).toString(),
      "X-RateLimit-Reset": Math.ceil(
        (currentTime + windowMs) / 1000
      ).toString(),
    });

    next();
  };
};

/**
 * Clean up old entries from request store
 * @param {number} windowStart - Window start timestamp
 */
const cleanupOldEntries = (windowStart) => {
  const keysToDelete = [];

  for (const [clientId, requests] of requestStore.entries()) {
    const validRequests = requests.filter(
      (timestamp) => timestamp > windowStart
    );

    if (validRequests.length === 0) {
      keysToDelete.push(clientId);
    } else {
      requestStore.set(clientId, validRequests);
    }
  }

  keysToDelete.forEach((key) => requestStore.delete(key));
};

/**
 * Strict rate limiter for sensitive operations
 * Lower limits for blockchain transactions, etc.
 */
export const strictRateLimiter = rateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 10,
  message: "Too many sensitive operations, please try again later",
});

/**
 * Blockchain operation rate limiter
 * Special limits for blockchain operations
 */
export const blockchainRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5,
  message: "Too many blockchain operations, please try again later",
});
