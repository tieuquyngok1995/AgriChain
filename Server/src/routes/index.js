/**
 * Main router file for AgriChain API
 * Aggregates all route modules
 */

import { Router } from "express";
import userRouter from "./user.route.js";
import transactionRoutes from "./transaction.routes.js";
import agrichainRoutes from "./agrichain.routes.js";
import fileRoutes from "./file.routes.js";
import farmerRoutes from "./farmer.routes.js";

const router = Router();

// API version info
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AgriChain API v1.0 - Agricultural Data Traceability",
    version: "1.0.0",
    description:
      "Blockchain-based agricultural data integrity and traceability system",
    endpoints: {
      users: "/api/users",
      farmers: "/api/farmers",
      transactions: "/api/transactions",
      agrichain: "/api/agrichain",
      files: "/api/files",
      health: "/api/health",
    },
    features: {
      hashGeneration: "SHA-256 hash generation for data integrity",
      blockchainStorage: "Store data hashes on Polygon blockchain",
      dataVerification: "Verify data integrity against blockchain records",
      traceability: "Full agricultural data traceability chain",
      fileUpload:
        "Upload files with agricultural data for enhanced traceability",
    },
  });
});

// Route modules
router.use("/users", userRouter);
router.use("/farmers", farmerRoutes);
router.use("/transactions", transactionRoutes);
router.use("/agrichain", agrichainRoutes);
router.use("/files", fileRoutes);

export default router;
