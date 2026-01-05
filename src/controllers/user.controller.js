// src/controllers/user.controller.js
const User = require("../modules/users/user.model");

const getUserProfile = async (req, res) => {
  try {
    // User is already attached by auth middleware
    res.status(200).json({
      status: "success",
      data: req.user,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch user profile",
    });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, email } = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (email) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
      user.email = email;
    }

    await user.save();

    res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to update user profile",
    });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
};