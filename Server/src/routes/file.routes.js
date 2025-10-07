/**
 * File Upload Routes for AgriChain
 * Defines API endpoints for file upload functionality
 */

import express from "express";
import { FileController } from "../controllers/agrichain.controller.js";
import { upload } from "../services/file.service.js";
import { validateAgriData } from "../middlewares/validation.middleware.js";
import { rateLimiter } from "../middlewares/rateLimiter.middleware.js";
import {
  handleFileUploadErrors,
  validateUploadedFiles,
  cleanupFilesOnError,
} from "../middlewares/fileUpload.middleware.js";

const router = express.Router();

/**
 * POST /api/files/store-with-files
 * Store agricultural data with file uploads
 * Supports multiple file uploads (max 5 files, 10MB each)
 */
router.post(
  "/store-with-files",
  rateLimiter,
  upload.array("files", 5), // Accept up to 5 files with field name 'files'
  validateUploadedFiles,
  validateAgriData,
  FileController.storeWithFiles
);

/**
 * POST /api/files/store-text-only
 * Store agricultural data without files (text only)
 */
router.post(
  "/store-text-only",
  rateLimiter,
  validateAgriData,
  FileController.storeTextOnly
);

/**
 * GET /api/files/retrieve/:transactionHash
 * Retrieve agricultural data by transaction hash
 * Works for both file-based and text-only data
 */
router.get(
  "/retrieve/:transactionHash",
  rateLimiter,
  FileController.retrieveData
);

/**
 * POST /api/files/verify/:transactionHash
 * Verify agricultural data integrity
 * Can include files for combined verification or text-only
 */
router.post(
  "/verify/:transactionHash",
  rateLimiter,
  upload.array("files", 5), // Optional files for verification
  validateUploadedFiles,
  FileController.verifyDataIntegrity
);

/**
 * GET /api/files/stats
 * Get file upload service statistics and information
 */
router.get("/stats", rateLimiter, FileController.getUploadStats);

// Error handling middleware for file uploads
router.use(handleFileUploadErrors);
router.use(cleanupFilesOnError);

export default router;
