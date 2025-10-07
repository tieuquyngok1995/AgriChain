/**
 * Farmer Routes - Routes for farmer management
 * Uses new model-based controllers
 */

import express from "express";
import {
  createFarmer,
  getFarmers,
  getFarmerById,
  updateFarmer,
  getFarmerStatistics,
  getFarmersByProvince,
  getFarmersByCertification,
  getFarmersSummaryByProvince,
  deactivateFarmer,
  activateFarmer,
  getFarmerByEmail,
  checkFarmerExists,
  getFarmersCount,
} from "../controllers/farmer.controller.js";

const router = express.Router();

// GET /api/farmers/count - Get farmers count
router.get("/count", getFarmersCount);

// GET /api/farmers/summary/by-province - Get farmers summary by province
router.get("/summary/by-province", getFarmersSummaryByProvince);

// GET /api/farmers/by-province/:province - Get farmers by province
router.get("/by-province/:province", getFarmersByProvince);

// GET /api/farmers/by-certification/:level - Get farmers by certification
router.get("/by-certification/:level", getFarmersByCertification);

// GET /api/farmers/by-email/:email - Get farmer by email
router.get("/by-email/:email", getFarmerByEmail);

// GET /api/farmers/exists/:id - Check if farmer exists
router.get("/exists/:id", checkFarmerExists);

// GET /api/farmers/:id/statistics - Get farmer statistics
router.get("/:id/statistics", getFarmerStatistics);

// GET /api/farmers/:id - Get farmer by ID
router.get("/:id", getFarmerById);

// GET /api/farmers - Get all farmers with pagination and search
router.get("/", getFarmers);

// POST /api/farmers - Create new farmer
router.post("/", createFarmer);

// PUT /api/farmers/:id - Update farmer
router.put("/:id", updateFarmer);

// PUT /api/farmers/:id/deactivate - Deactivate farmer
router.put("/:id/deactivate", deactivateFarmer);

// PUT /api/farmers/:id/activate - Activate farmer
router.put("/:id/activate", activateFarmer);

export default router;
