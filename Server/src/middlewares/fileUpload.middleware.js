/**
 * File Upload Error Middleware
 * Handles multer and file upload related errors
 */

import multer from "multer";
import fs from "fs";
import { error } from "../utils/response.js";
import { logger } from "../utils/logger.js";

/**
 * Handle file upload errors
 * @param {Error} err - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
export const handleFileUploadErrors = (err, req, res, next) => {
  // Handle multer errors
  if (err instanceof multer.MulterError) {
    logger.error("Multer error occurred", {
      code: err.code,
      message: err.message,
      field: err.field,
    });

    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        return res
          .status(400)
          .json(error("File too large. Maximum size is 10MB per file."));

      case "LIMIT_FILE_COUNT":
        return res
          .status(400)
          .json(error("Too many files. Maximum 5 files allowed."));

      case "LIMIT_UNEXPECTED_FILE":
        return res
          .status(400)
          .json(
            error(
              `Unexpected field: ${err.field}. Use 'files' field for uploads.`
            )
          );

      case "LIMIT_PART_COUNT":
        return res.status(400).json(error("Too many form parts."));

      case "LIMIT_FIELD_KEY":
        return res.status(400).json(error("Field name too long."));

      case "LIMIT_FIELD_VALUE":
        return res.status(400).json(error("Field value too long."));

      case "LIMIT_FIELD_COUNT":
        return res.status(400).json(error("Too many fields."));

      default:
        return res.status(400).json(error(`File upload error: ${err.message}`));
    }
  }

  // Handle custom file type errors
  if (err.message && err.message.includes("not allowed")) {
    logger.error("Invalid file type uploaded", {
      message: err.message,
      files: req.files?.map((f) => ({
        name: f.originalname,
        type: f.mimetype,
      })),
    });
    return res.status(400).json(error(err.message));
  }

  // Handle file system errors
  if (err.code === "ENOENT") {
    logger.error("File not found error", { message: err.message });
    return res.status(404).json(error("File not found"));
  }

  if (err.code === "EACCES") {
    logger.error("File permission error", { message: err.message });
    return res.status(403).json(error("File access permission denied"));
  }

  if (err.code === "ENOSPC") {
    logger.error("Disk space error", { message: err.message });
    return res.status(507).json(error("Insufficient storage space"));
  }

  // Pass other errors to next middleware
  next(err);
};

/**
 * Validate uploaded files
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
export const validateUploadedFiles = (req, res, next) => {
  try {
    const files = req.files || [];

    // Log upload attempt
    logger.info("File upload validation", {
      fileCount: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      files: files.map((f) => ({
        name: f.originalname,
        size: f.size,
        type: f.mimetype,
      })),
    });

    // Additional validation can be added here
    // For example, scan files for viruses, validate content, etc.

    next();
  } catch (error) {
    logger.error("File validation error", { error: error.message });
    res.status(500).json(error("File validation failed"));
  }
};

/**
 * Clean up uploaded files on error
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
export const cleanupFilesOnError = (err, req, res, next) => {
  // Clean up uploaded files if an error occurred
  if (req.files && req.files.length > 0) {
    req.files.forEach((file) => {
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          logger.info("Cleaned up file after error", {
            filename: file.filename,
          });
        }
      } catch (cleanupError) {
        logger.error("Failed to cleanup file", {
          filename: file.filename,
          error: cleanupError.message,
        });
      }
    });
  }

  next(err);
};
