/**
 * User controllers for user management operations
 * Handles HTTP requests related to user functionality
 */

import { success, sendResponse } from "../utils/response.js";
import { logger } from "../utils/logger.js";

/**
 * Get all users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUsers = async (req, res) => {
  try {
    logger.info("Getting all users");

    // Mock data - replace with actual database query
    const users = [
      { id: 1, name: "Alice", email: "alice@example.com", role: "farmer" },
      { id: 2, name: "Bob", email: "bob@example.com", role: "supplier" },
    ];

    const responseData = success(users, "Users retrieved successfully");
    sendResponse(res, responseData);
  } catch (error) {
    logger.error("Error getting users", { error: error.message });
    throw error;
  }
};

/**
 * Create new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createUser = async (req, res) => {
  try {
    const userData = req.body;

    logger.info("Creating new user", { name: userData.name });

    // Mock user creation - replace with actual database insertion
    const newUser = {
      id: Date.now(),
      ...userData,
      createdAt: new Date().toISOString(),
    };

    const responseData = success(newUser, "User created successfully");
    sendResponse(res, responseData);
  } catch (error) {
    logger.error("Error creating user", { error: error.message });
    throw error;
  }
};
