// src/routes/user.routes.js
const express = require("express");
const router = express.Router();
const { getUserProfile, updateUserProfile } = require("../controllers/user.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// Apply authentication middleware to all user routes
router.use(authMiddleware);

// GET /users/me - Get current user profile
router.get("/me", getUserProfile);

// PUT /users/profile - Update user profile
router.put("/profile", updateUserProfile);

module.exports = router;