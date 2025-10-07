/**
 * User routes for user management
 * Defines API endpoints for user-related functionality
 */

import { Router } from "express";
import { getUsers, createUser } from "../controllers/user.controller.js";
import { validateRequiredFields, asyncHandler } from "../middlewares/index.js";

const router = Router();

// Get all users
router.get("/", asyncHandler(getUsers));

// Create new user with validation
router.post(
  "/",
  validateRequiredFields(["name", "email"]),
  asyncHandler(createUser)
);

export default router;
