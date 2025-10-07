/**
 * Farmer Controller - Example implementation using new models
 * Demonstrates CRUD operations with validation and error handling
 */

import { Farmer } from "../models/index.js";
import { success, error } from "../utils/response.js";
import { asyncHandler } from "../middlewares/error.middleware.js";
import { logger } from "../utils/logger.js";

/**
 * Create new farmer
 * POST /api/farmers
 */
export const createFarmer = asyncHandler(async (req, res) => {
  const farmerData = req.body;

  // Create farmer using model
  const newFarmer = await Farmer.createFarmer(farmerData);

  res.status(201).json(success(newFarmer, "Farmer created successfully"));
});

/**
 * Get all farmers with pagination and search
 * GET /api/farmers?page=1&pageSize=10&search=keyword
 */
export const getFarmers = asyncHandler(async (req, res) => {
  const { page = 1, pageSize = 10, search } = req.query;

  const result = await Farmer.getActiveFarmers(
    parseInt(page),
    parseInt(pageSize),
    search
  );

  res.json(success(result, "Farmers retrieved successfully"));
});

/**
 * Get farmer by ID
 * GET /api/farmers/:id
 */
export const getFarmerById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const farmer = await Farmer.findById(id);

  if (!farmer) {
    return res.status(404).json(error("Farmer not found"));
  }

  res.json(success(farmer, "Farmer retrieved successfully"));
});

/**
 * Update farmer
 * PUT /api/farmers/:id
 */
export const updateFarmer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const updatedFarmer = await Farmer.updateFarmer(id, updateData);

  res.json(success(updatedFarmer, "Farmer updated successfully"));
});

/**
 * Get farmer statistics
 * GET /api/farmers/:id/statistics
 */
export const getFarmerStatistics = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const statistics = await Farmer.getFarmerStatistics(id);

  res.json(success(statistics, "Farmer statistics retrieved successfully"));
});

/**
 * Get farmers by province
 * GET /api/farmers/by-province/:province
 */
export const getFarmersByProvince = asyncHandler(async (req, res) => {
  const { province } = req.params;
  const { page = 1, pageSize = 10 } = req.query;

  const farmers = await Farmer.findByProvince(
    province,
    parseInt(pageSize),
    (parseInt(page) - 1) * parseInt(pageSize)
  );

  res.json(success(farmers, `Farmers in ${province} retrieved successfully`));
});

/**
 * Get farmers by certification level
 * GET /api/farmers/by-certification/:level
 */
export const getFarmersByCertification = asyncHandler(async (req, res) => {
  const { level } = req.params;
  const { page = 1, pageSize = 10 } = req.query;

  const farmers = await Farmer.findByCertification(
    level,
    parseInt(pageSize),
    (parseInt(page) - 1) * parseInt(pageSize)
  );

  res.json(
    success(
      farmers,
      `Farmers with ${level} certification retrieved successfully`
    )
  );
});

/**
 * Get farmers summary by province
 * GET /api/farmers/summary/by-province
 */
export const getFarmersSummaryByProvince = asyncHandler(async (req, res) => {
  const summary = await Farmer.getFarmersSummaryByProvince();

  res.json(
    success(summary, "Farmers summary by province retrieved successfully")
  );
});

/**
 * Deactivate farmer
 * PUT /api/farmers/:id/deactivate
 */
export const deactivateFarmer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deactivatedFarmer = await Farmer.deactivateFarmer(id);

  res.json(success(deactivatedFarmer, "Farmer deactivated successfully"));
});

/**
 * Activate farmer
 * PUT /api/farmers/:id/activate
 */
export const activateFarmer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const activatedFarmer = await Farmer.activateFarmer(id);

  res.json(success(activatedFarmer, "Farmer activated successfully"));
});

/**
 * Get farmer by email
 * GET /api/farmers/by-email/:email
 */
export const getFarmerByEmail = asyncHandler(async (req, res) => {
  const { email } = req.params;

  const farmer = await Farmer.findByEmail(email);

  if (!farmer) {
    return res.status(404).json(error("Farmer not found"));
  }

  res.json(success(farmer, "Farmer retrieved successfully"));
});

/**
 * Check if farmer exists
 * GET /api/farmers/exists/:id
 */
export const checkFarmerExists = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const exists = await Farmer.exists({ farmer_id: id, is_active: true });

  res.json(
    success({ exists }, exists ? "Farmer exists" : "Farmer does not exist")
  );
});

/**
 * Get farmers count
 * GET /api/farmers/count
 */
export const getFarmersCount = asyncHandler(async (req, res) => {
  const { active_only = "true" } = req.query;

  const conditions = active_only === "true" ? { is_active: true } : {};
  const count = await Farmer.count(conditions);

  res.json(success({ count }, "Farmers count retrieved successfully"));
});
