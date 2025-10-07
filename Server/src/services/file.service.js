/**
 * File Upload Service for AgriChain
 * Handles file uploads, storage, and hash generation
 */

import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { logger } from "../utils/logger.js";

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Configure multer storage
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create farmer-specific directory
    const farmerId = req.body.farmerId || "unknown";
    const farmerDir = path.join(uploadsDir, farmerId);

    if (!fs.existsSync(farmerDir)) {
      fs.mkdirSync(farmerDir, { recursive: true });
    }

    cb(null, farmerDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const filename = `${name}_${timestamp}${ext}`;
    cb(null, filename);
  },
});

/**
 * File filter for allowed types
 */
const fileFilter = (req, file, cb) => {
  // Allowed file types for agricultural documents
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
};

/**
 * Multer configuration
 */
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Maximum 5 files per request
  },
});

/**
 * Generate hash from file content
 * @param {string} filePath - Path to file
 * @returns {Promise<string>} - SHA-256 hash of file
 */
export const generateFileHash = async (filePath) => {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    const fileStats = fs.statSync(filePath);

    logger.info("File hash generated", {
      filePath: path.basename(filePath),
      hash: hash.substring(0, 10) + "...",
      size: fileStats.size,
    });

    return `0x${hash}`;
  } catch (error) {
    logger.error("Failed to generate file hash", {
      filePath,
      error: error.message,
    });
    throw new Error(`File hash generation failed: ${error.message}`);
  }
};

/**
 * Generate combined hash from data and files
 * @param {Object} data - Agricultural data
 * @param {Array} files - Array of uploaded files
 * @returns {Object} - Combined hash and metadata
 */
export const generateCombinedHash = async (data, files = []) => {
  try {
    let combinedContent = "";

    // Add data content
    const dataString = JSON.stringify(data, null, 0);
    combinedContent += dataString;

    // File information array
    const fileInfo = [];

    // Add file contents
    if (files && files.length > 0) {
      for (const file of files) {
        const fileBuffer = fs.readFileSync(file.path);
        const fileHash = crypto
          .createHash("sha256")
          .update(fileBuffer)
          .digest("hex");

        // Add file content to combined content
        combinedContent += fileHash;

        fileInfo.push({
          originalName: file.originalname,
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype,
          hash: `0x${fileHash}`,
          path: file.path,
        });

        logger.info("File processed for combined hash", {
          filename: file.filename,
          size: file.size,
          hash: fileHash.substring(0, 10) + "...",
        });
      }
    }

    // Generate final combined hash
    const combinedHash = crypto
      .createHash("sha256")
      .update(combinedContent, "utf8")
      .digest("hex");

    const result = {
      combinedHash: `0x${combinedHash}`,
      dataHash: crypto
        .createHash("sha256")
        .update(dataString, "utf8")
        .digest("hex"),
      files: fileInfo,
      metadata: {
        hasFiles: files.length > 0,
        fileCount: files.length,
        totalSize: fileInfo.reduce((sum, file) => sum + file.size, 0),
        dataSize: dataString.length,
        combinedSize: combinedContent.length,
        timestamp: new Date().toISOString(),
      },
    };

    logger.info("Combined hash generated successfully", {
      dataSize: result.metadata.dataSize,
      fileCount: result.metadata.fileCount,
      totalSize: result.metadata.totalSize,
      combinedHash: result.combinedHash.substring(0, 10) + "...",
    });

    return result;
  } catch (error) {
    logger.error("Failed to generate combined hash", { error: error.message });
    throw new Error(`Combined hash generation failed: ${error.message}`);
  }
};

/**
 * Get file information without reading content
 * @param {string} filePath - Path to file
 * @returns {Object} - File metadata
 */
export const getFileInfo = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    const basename = path.basename(filePath);
    const ext = path.extname(filePath);

    return {
      filename: basename,
      extension: ext,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isFile: stats.isFile(),
      path: filePath,
    };
  } catch (error) {
    throw new Error(`Failed to get file info: ${error.message}`);
  }
};

/**
 * Clean up old files (optional - for maintenance)
 * @param {number} maxAgeHours - Maximum age in hours
 */
export const cleanupOldFiles = (maxAgeHours = 24) => {
  try {
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
    const now = Date.now();

    const cleanupDirectory = (dir) => {
      const files = fs.readdirSync(dir);

      files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
          cleanupDirectory(filePath);
        } else if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          logger.info("Old file cleaned up", { filePath });
        }
      });
    };

    cleanupDirectory(uploadsDir);
    logger.info("File cleanup completed", { maxAgeHours });
  } catch (error) {
    logger.error("File cleanup failed", { error: error.message });
  }
};

export const FileService = {
  generateFileHash,
  generateCombinedHash,
  getFileInfo,
  cleanupOldFiles,
};
